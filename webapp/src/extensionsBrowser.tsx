import * as data from "./data";
import * as React from "react";
import * as core from "./core";
import * as workspace from "./workspace";
import * as pkg from "./package";

import { MenuBar } from "../../react-common/components/controls/MenuBar";
import { Button } from "../../react-common/components/controls/Button";
import { workerOpAsync } from "./compiler";
import { SearchInput } from "./components/searchInput";
import { useState, useEffect } from "react";
import { ImportModal } from "../../react-common/components/extensions/ImportModal";
import { DeleteConfirmationModal } from "../../react-common/components/extensions/DeleteConfirmationModal";
import { ExtensionCard } from "../../react-common/components/extensions/ExtensionCard";

type ExtensionMeta = pxtc.service.ExtensionMeta;
const emptyCard = { name: "", loading: true }

interface ExtensionsProps {
    isVisible: boolean;
    hideExtensions: () => void;
    header: pxt.workspace.Header;
    reloadHeaderAsync: () => Promise<void>;
}

enum TabState {
    Recommended,
    Installed,
    InDevelopment
}

export const ExtensionsBrowser = (props: ExtensionsProps) => {

    const [searchFor, setSearchFor] = useState("");
    const [allExtensions, setAllExtensions] = useState(fetchBundled());
    const [extensionsToShow, setExtensionsToShow] = useState([]);
    const [selectedTag, setSelectedTag] = useState("");
    const [currentTab, setCurrentTab] = useState(TabState.Recommended);
    const [showImportExtensionDialog, setShowImportExtensionDialog] = useState(false);
    const [installedExtensions, setInstalledExtensions] = useState([])
    const [lastVisibleState, setLastVisibleState] = useState(props.isVisible)
    const [deletionCandidate, setDeletionCandidate] = useState(undefined)
    const [preferredExts, setPreferredExts] = useState([])
    const [extensionTags, setExtensionTags] = useState(new Map<string, pxt.RepoData[]>())

    if (lastVisibleState != props.isVisible) {
        updateInstalledExts();
        updateExtensionTags();
        setLastVisibleState(props.isVisible)
        updatePreferredExts();
        if (!props.isVisible) {
            setCurrentTab(TabState.Recommended)
            setSearchFor("")
            setSelectedTag("")
        }
    }


    useEffect(() => {
        updateInstalledExts();
    }, [])

    useEffect(() => {
        if (searchFor && searchFor != "") {
            if (searchFor.indexOf("/") >= 0) {
                searchForGithubAsync();
            } else {
                workerOpAsync("extensionSearch", {
                    search: {
                        term: searchFor
                    },
                    extensions: {
                        srcs: Array.from(allExtensions.values())
                    }
                }).then(e => {
                    setExtensionsToShow(e)
                    setSelectedTag("")
                })
            }
        }
    }, [searchFor])

    /**
     * Github search
     */
    async function searchForGithubAsync() {
        setExtensionsToShow([emptyCard, emptyCard, emptyCard, emptyCard])
        const exts = await fetchGithubDataAsync([searchFor])
        const parsedExt = exts.map(repo => parseGithubRepo(repo))
        addExtensionsToPool(parsedExt)
        setExtensionsToShow(parsedExt)
    }

    function addExtensionsToPool(newExtension: ExtensionMeta[]) {
        if (!newExtension) {
            return;
        }
        const addedExtensions = allExtensions;
        newExtension.forEach(e => {
            if (!addedExtensions.has(e.name.toLowerCase())) {
                addedExtensions.set(e.name.toLowerCase(), e)
            }
        })
        setAllExtensions(addedExtensions);
    }

    function getExtensionFromFetched(extensionUrl: string) {
        const fullName = allExtensions.get(extensionUrl.toLowerCase())
        if (fullName) {
            return fullName
        }
        const parsedGithubRepo = pxt.github.parseRepoId(extensionUrl)
        if (!parsedGithubRepo) return undefined;
        return allExtensions.get(parsedGithubRepo.slug.toLowerCase())
    }

    async function removeDepAsync(dep: ExtensionMeta) {
        setDeletionCandidate(undefined)
        props.hideExtensions()
        await pkg.mainEditorPkg().removeDepAsync(dep.name)
        await pxt.Util.delay(1000) // TODO VVN: Without a delay the reload still tries to load the extension
        await props.reloadHeaderAsync()
    }

    async function addDepIfNoConflict(config: pxt.PackageConfig, version: string) {
        try {
            props.hideExtensions();
            core.showLoading("installingextension", lf("Installing extension..."))
            const added = await pkg.mainEditorPkg()
                .addDependencyAsync({ ...config, isExtension: true }, version, false)
            if (added) {
                await pxt.Util.delay(1000)
                await props.reloadHeaderAsync();
            }
        }
        finally {
            core.hideLoading("installingextension")
        }
    }


    function updateExtensionTags() {
        if (extensionTags.size > 0)
            return
        let trgConfigFetch = data.getDataWithStatus("target-config:");
        let trgConfig = trgConfigFetch.data as pxt.TargetConfig;
        if (!trgConfig || !trgConfig.packages || !trgConfig.packages.preferredRepoLib)
            return;
        const allRepos = [...trgConfig.packages.preferredRepoLib, ...trgConfig.packages.approvedRepoLib]
        const newMap = extensionTags
        allRepos.forEach(repo => {
            repo.tags?.forEach(tag => {
                if (!newMap.has(tag)) {
                    newMap.set(tag, [])
                }
                const repos = newMap.get(tag)
                if (!repos.find(r => r.slug.toLowerCase() == repo.slug.toLowerCase()))
                    newMap.set(tag, [...newMap.get(tag), repo])
            })
        })
        setExtensionTags(newMap)
    }

    async function addGithubPackage(scr: ExtensionMeta) {
        let r: { version: string, config: pxt.PackageConfig };
        try {
            core.showLoading("downloadingpackage", lf("downloading extension..."));
            const pkg = getExtensionFromFetched(scr.name);
            if (pkg) {
                r = await pxt.github.downloadLatestPackageAsync(pkg.repo);
            } else {
                const res = await fetchGithubDataAsync([scr.name]);
                if (res && res.length > 0) {
                    const parsed = parseGithubRepo(res[0])
                    addExtensionsToPool([parsed])
                    r = await pxt.github.downloadLatestPackageAsync(parsed.repo)
                }
            }
        }
        catch (e) {
            core.handleNetworkError(e);
        } finally {
            core.hideLoading("downloadingpackage");
        }
        return await addDepIfNoConflict(r.config, r.version)
    }

    async function fetchGithubDataAsync(preferredRepos: string[]): Promise<pxt.github.GitRepo[]> {
        return data.getAsync<pxt.github.GitRepo[]>(`gh-search:${preferredRepos.join("|")}`);
    }

    async function fetchGithubDataAndAddAsync(repos: string[], cb: (exts: ExtensionMeta[]) => void): Promise<void> {
        const fetched = await fetchGithubDataAsync(repos)
        if (fetched) {
            const parsed = fetched.map(r => parseGithubRepo(r))
            addExtensionsToPool(parsed)
            cb(parsed);
        }
    }

    function fetchLocalRepositories(): pxt.workspace.Header[] {
        let r = workspace.getHeaders()
        if (!/localdependencies=1/i.test(window.location.href))
            r = r.filter(h => !!h.githubId);
        if (props.header)
            r = r.filter(h => h.id != props.header.id) // don't self-reference
        return r;
    }

    function addLocal(hd: pxt.workspace.Header) {
        workspace.getTextAsync(hd.id)
            .then(files => {
                let cfg = JSON.parse(files[pxt.CONFIG_NAME]) as pxt.PackageConfig
                return addDepIfNoConflict(cfg, "workspace:" + hd.id)
            })
    }

    function installExtension(scr: ExtensionMeta) {
        switch (scr.type) {
            case pxtc.service.ExtensionType.Bundled:
                pxt.tickEvent("packages.bundled", { name: scr.name });
                props.hideExtensions();
                addDepIfNoConflict(scr.pkgConfig, "*")
                break;
            case pxtc.service.ExtensionType.Github:
                props.hideExtensions();
                addGithubPackage(scr);
                break;
        }

        updateInstalledExts()
    }

    function parseGithubRepo(r: pxt.github.GitRepo): ExtensionMeta {
        return {
            name: r.name,
            type: pxtc.service.ExtensionType.Github,
            imageUrl: pxt.github.repoIconUrl(r),
            repo: r,
            description: r.description,
            fullName: r.fullName
        }
    }


    function getCategoryNames(): string[] {
        if (!extensionTags) return [];
        return Array.from(extensionTags.keys())
    }

    function handleInstalledCardClick(src: ExtensionMeta) {
        setDeletionCandidate(src)
    }

    async function handleCategoryClick(category: string) {
        if (category == selectedTag) {
            setSelectedTag("")
            setExtensionsToShow([])
            return;
        }
        setSelectedTag(category)
        setSearchFor("")

        const categoryExtensions = extensionTags.get(category)

        const toBeFetched: string[] = []
        const extensionsWeHave: ExtensionMeta[] = []

        categoryExtensions.forEach(e => {
            const fetched = getExtensionFromFetched(e.slug);
            if (!fetched) {
                toBeFetched.push(e.slug)
            } else {
                extensionsWeHave.push(fetched)
            }
        })

        if (toBeFetched.length > 0) {
            fetchGithubDataAndAddAsync(toBeFetched, (ext) => setExtensionsToShow([...extensionsWeHave, ...ext]))
        }
        const loadingCards = []
        for (let i = 0; i < toBeFetched.length; i++) {
            loadingCards.push(emptyCard)
        }
        setExtensionsToShow([...extensionsWeHave, ...loadingCards]);
    }

    function packageConfigToExtensionMeta(p: pxt.PackageConfig): ExtensionMeta {
        return {
            name: p.name,
            imageUrl: p.icon,
            type: pxtc.service.ExtensionType.Bundled,
            pkgConfig: p,
            description: p.description
        }
    }

    function handleHomeButtonClick() {
        setSelectedTag("")
        setSearchFor("")
    }

    function fetchBundled(): Map<string, ExtensionMeta> {
        const bundled = pxt.appTarget.bundledpkgs;
        const extensionsMap = new Map<string, ExtensionMeta>();
        Object.keys(bundled).filter(k => !/prj$/.test(k))
            .map(k => JSON.parse(bundled[k]["pxt.json"]) as pxt.PackageConfig)
            .filter(pk => !pk.hidden)
            .filter(pk => !/---/.test(pk.name))
            .filter(pk => pk.name != "core")
            .filter(pk => false == !!pk.core) // show core in "boards" mode
            .forEach(e => extensionsMap.set(e.name, packageConfigToExtensionMeta(e)))
        return extensionsMap
    }

    function updatePreferredExts() {
        const bundled = fetchBundled();
        const repos: ExtensionMeta[] = [];
        bundled.forEach(e => {
            repos.push(e)
        })
        let trgConfigFetch = data.getDataWithStatus("target-config:");
        let trgConfig = trgConfigFetch.data as pxt.TargetConfig;

        const toBeFetched: string[] = [];
        if (trgConfig && trgConfig.packages && trgConfig.packages.preferredRepoLib) {
            trgConfig.packages.preferredRepoLib.forEach(r => {
                const fetched = getExtensionFromFetched(r.slug)
                if (fetched) {
                    repos.push(fetched)
                } else {
                    toBeFetched.push(r.slug)
                }
            })
        }
        const loadingCards = [];
        for (let i = 0; i < toBeFetched.length; i++) {
            loadingCards.push(emptyCard)
        }
        setPreferredExts([...repos, ...loadingCards])

        fetchGithubDataAndAddAsync(toBeFetched, (exts) => setPreferredExts([...repos, ...exts]));
    }

    /**
     * Loads installed extensions' info from Github
     *
     */
     async function updateInstalledExts() {
        const installed: ExtensionMeta[] = []
        const reposToFetch: string[] = [];
        Object.keys(pkg.mainPkg?.deps as Object).forEach((k) => {
            if (k == "this" || k == "core") {
                return;
            }
            const ext = pkg.mainPkg.deps[k];
            if (ext?.installedVersion?.includes("github")) {
                const match = /github:(\S*)#?/.exec(ext.installedVersion);
                const repoName = match[1]

                let fetchedRepo = getExtensionFromFetched(k);

                if (fetchedRepo) {
                    installed.push(fetchedRepo)
                } else {
                    reposToFetch.push(repoName)
                }
            } else {
                installed.push({
                    name: ext?.config?.name,
                    imageUrl: ext?.config?.icon,
                    description: ext?.config?.description
                })
            }
        })

        if (reposToFetch && reposToFetch.length > 0) {
            fetchGithubDataAndAddAsync(reposToFetch, (ext) => setInstalledExtensions([...installed, ...ext]))
        }
        setInstalledExtensions(installed)
    }

    function handleImportUrl(url: string) {
        setShowImportExtensionDialog(false)
        props.hideExtensions()
        const ext = getExtensionFromFetched(url)
        if (!ext) {
            fetchGithubDataAndAddAsync([url], (exts) => addExtensionsToPool(exts))
        } else {
            addGithubPackage(ext)
        }
    }

    enum ExtensionView {
        Tabbed,
        Search,
        Tags
    }

    let displayMode: ExtensionView;
    if (searchFor != "") {
        displayMode = ExtensionView.Search
    } else if (selectedTag != "") {
        displayMode = ExtensionView.Tags
    } else {
        displayMode = ExtensionView.Tabbed;
    }

    const categoryNames = getCategoryNames();
    const local = currentTab == TabState.InDevelopment ? fetchLocalRepositories() : undefined

    return <div className={`extensionsBrowser ${props.isVisible ? "" : "hide"}`} >
        {showImportExtensionDialog ? <ImportModal onCancelClick={() => setShowImportExtensionDialog(false)} onImportClick={handleImportUrl} /> : undefined}
        {deletionCandidate ? <DeleteConfirmationModal ns={deletionCandidate.name} onCancelClick={() => { setDeletionCandidate(undefined) }} onDeleteClick={() => { removeDepAsync(deletionCandidate)}} /> : undefined}
        <MenuBar className="extensionsHeader" ariaLabel={lf("Extentions")}>
            <div className="header-left">
                <Button className="menu-button" leftIcon="fas fa-arrow-left large" title={lf("Back")} label={lf("Back")} onClick={props.hideExtensions} />
            </div>
            <div className="header-center">
                {lf("Extensions")}
            </div>
            <div className="header-right"></div>
        </MenuBar>
        <div className="extensionSearchHeader">
            <div className="header">{(lf("Do more with your micro:bit"))}</div>
            <SearchInput searchHandler={setSearchFor} />
            <div className="extensionTags">
                {categoryNames.map(c =>
                    <div className={"extensionTag " + (selectedTag == c ? "selected" : "")} onClick={() => handleCategoryClick(c)}>{c}</div>
                )}
            </div>
            {/* TODO bring in the import modal in later! <div className="importButton">
                <span>{lf("or ")}</span>
                <div className="importButtonLink" onClick={() => setShowImportExtensionDialog(true)}>{lf("import extension")}</div>
            </div> */}
        </div>
        {displayMode == ExtensionView.Search &&
            <div className="extension-display">
                <div className="breadcrumbs">
                    <span className="link" onClick={handleHomeButtonClick}>{lf("Home")}</span>
                </div>
                <div className="extension-grid">
                    {extensionsToShow?.map(scr =>
                        <ExtensionCard scr={scr} onCardClick={installExtension} learnMoreUrl={scr.fullName ? `/pkg/${scr.fullName}` : undefined}
                            name={scr.name} imageUrl={scr.imageUrl} description={scr.description} loading={scr.loading} />)}
                </div>
            </div>}
        {displayMode == ExtensionView.Tags &&
            <div className="extension-display">
                <div className="breadcrumbs">
                    <span className="link" onClick={handleHomeButtonClick}>{lf("Home")}</span>
                    <span>/</span>
                    <span>{selectedTag}</span>
                </div>
                <div className="extension-grid">
                    {extensionsToShow?.map(scr =>
                        <ExtensionCard scr={scr} onCardClick={installExtension} learnMoreUrl={scr.fullName ? `/pkg/${scr.fullName}` : undefined}
                            name={scr.name} imageUrl={scr.imageUrl} description={scr.description} loading={scr.loading} />)}
                </div>
            </div>}
        {displayMode == ExtensionView.Tabbed &&
            <div className="extension-display">
                <div className="tab-header">
                        <Button title={lf("Recommended")} label={lf("Recommended")} onClick={() => { setCurrentTab(TabState.Recommended) }} className={currentTab == TabState.Recommended ? "selected" : ""} />
                        <Button title={lf("Installed")} label={lf("Installed")} onClick={() => { setCurrentTab(TabState.Installed) }} className={currentTab == TabState.Installed ? "selected" : ""} />
                        <Button title={lf("In Development")} label={lf("In Development")} onClick={() => { setCurrentTab(TabState.InDevelopment) }} className={currentTab == TabState.InDevelopment ? "selected" : ""} />
                </div>
                {currentTab == TabState.Recommended && preferredExts.map(e => <ExtensionCard scr={e} name={e.name} onCardClick={installExtension} imageUrl={e.imageUrl} description={e.description}
                        learnMoreUrl={e.fullName ? `/pkg/${e.fullName}`: undefined} loading={e.loading} />)}
                {currentTab == TabState.Installed && installedExtensions.map(e =>
                        <ExtensionCard scr={e} name={e.name} onCardClick={() => handleInstalledCardClick(e)} imageUrl={e.imageUrl} description={e.description} learnMoreUrl={e.fullName ? `/pkg/${e.fullName}` : undefined}/>)}
                {currentTab == TabState.InDevelopment && local.forEach(p => {
                            <ExtensionCard scr={p} name={p.name} description={lf("Local copy of {0} hosted on github.com", p.githubId)} onCardClick={addLocal} />
                        })}
            </div>
        }
    </div>
}
