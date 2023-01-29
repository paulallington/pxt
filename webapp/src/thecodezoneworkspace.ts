type Header = pxt.workspace.Header;
type Project = pxt.workspace.Project;
type ScriptText = pxt.workspace.ScriptText;
type WorkspaceProvider = pxt.workspace.WorkspaceProvider;
import U = pxt.Util;

export let projects: pxt.Map<Project> = {};
const projectId = U.parseQueryString(window.location.href)["pid"];

export function merge(prj: Project) {
    let h: Header = prj.header;
    if (!h) {
        prj.header = h = pxt.workspace.freshHeader(lf("Untitled"), U.nowSeconds())
        if (prj.text && prj.text[pxt.MAIN_BLOCKS]) {
            prj.header.editor = pxt.BLOCKS_PROJECT_NAME;
        }
    }
    projects[prj.header.id] = prj;
}

async function listAsync(): Promise<Header[]> {
    let p = await getProjectAsync();
    console.log("listAsync", projectId, p);
    return Promise.resolve([p.header]);
}

async function getProjectAsync(): Promise<Project>
{
    return U.requestAsync({
        url: "/api/Project/GetMakeCode/" + projectId,
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

async function setAsync(h: Header, prevVer: any, text?: ScriptText) {
    let autoSaveEnabled = pxt.BrowserUtils.autoSaveEnabled();

    if (!autoSaveEnabled){
        console.log("Auto Save Disabled")
        return Promise.resolve()
    }

    console.log("setAsync in cz", h, prevVer, text);

    if (text) {
        let obj = {
            header: h,
            text: text
        }

        U.requestAsync({
            url: "/api/Project/PutMakeCode/" + projectId,
            method: "POST",
            withCredentials: true,
            data: obj
        }).then((resp) => { console.log("RESPONSE", resp); });
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
