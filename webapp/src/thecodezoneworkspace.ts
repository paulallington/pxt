type Header = pxt.workspace.Header;
type Project = pxt.workspace.Project;
type ScriptText = pxt.workspace.ScriptText;
type WorkspaceProvider = pxt.workspace.WorkspaceProvider;
import U = pxt.Util;

export let projects: pxt.Map<Project> = {};

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

async function listAsync(project_id: string): Promise<Header[]> {
    let p = await getProjectAsync(project_id);
    console.log("listAsync", project_id, p);
    return Promise.resolve([p.header]);
}

async function getProjectAsync(project_id: string): Promise<Project>
{
    return U.requestAsync({
        url: "https://stage.thecodezone.co.uk/api/Project/GetMakeCode/" + project_id,
        method: "GET",
        withCredentials: true
    }).then(resp => resp.json);
}

async function getAsync(h: Header): Promise<pxt.workspace.File> {
    let p = await getProjectAsync(h.id);

    return Promise.resolve({
        header: h,
        text: p ? p.text : {},
        version: null,
    })
}

async function setAsync(h: Header, prevVer: any, text?: ScriptText) {
    console.log("setAsync in cz", h, prevVer, text);

    if (text) {
        let obj = {
            header: h,
            text: text
        }

        U.requestAsync({
            url: "https://stage.thecodezone.co.uk/api/Project/PutMakeCode/" + h.id,
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
