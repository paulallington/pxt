import * as pxteditor from "../../pxteditor";

type Header = pxt.workspace.Header;
type Project = pxt.workspace.Project;
type ScriptText = pxt.workspace.ScriptText;
type WorkspaceProvider = pxt.workspace.WorkspaceProvider;
import U = pxt.Util;

export let projects: pxt.Map<Project> = {};
const projectId: string = pxt.BrowserUtils.projectId();
const autoSaveEnabled: boolean = pxt.BrowserUtils.autoSaveEnabled();

export function merge(prj: Project) {
    let h: Header = prj.header;
    if (!h) {
        prj.header = h = pxteditor.workspace.freshHeader(lf("Untitled"), U.nowSeconds())
        if (prj.text && prj.text[pxt.MAIN_BLOCKS]) {
            prj.header.editor = pxt.BLOCKS_PROJECT_NAME;
        }
    }
    projects[prj.header.id] = prj;
}

async function listAsync(): Promise<Header[]> {
    let p = await getProjectAsync();
    return Promise.resolve([p.header]);
}

async function getProjectAsync(): Promise<Project>
{
    return U.requestAsync({
        url: pxt.appTarget.appTheme.tczApiDomain + "/api/Project/GetMakeCode/" + projectId,
        method: "GET",
        withCredentials: true
    }).then(resp => resp.json);
}

async function getAsync(h: Header): Promise<pxt.workspace.File> {
    let p = await getProjectAsync();

    return Promise.resolve({
        header: h,
        text: p ? p.text : {},
        version: null,
    })
}

async function setAsync(h: Header, prevVer: any, text?: ScriptText, forceSave?: boolean) {
    if (!autoSaveEnabled && !forceSave) {
        console.log("Auto Save Disabled")
        return Promise.resolve()
    }

    if (text) {
        let obj = {
            header: h,
            text: text
        }

        U.requestAsync({
            url: pxt.appTarget.appTheme.tczApiDomain + "/api/Project/PutMakeCode/" + projectId,
            method: "POST",
            withCredentials: true,
            data: obj
        })
    }
    return Promise.resolve()
}

function deleteAsync(h: Header, prevVer: any) {
    delete projects[h.id]
    return Promise.resolve()
}

function resetAsync(): Promise<void> {
    projects = {}
    return Promise.resolve();
}

export const provider: WorkspaceProvider = {
    getAsync,
    setAsync,
    deleteAsync,
    listAsync,
    resetAsync,
}
