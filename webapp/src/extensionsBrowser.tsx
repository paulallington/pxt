import * as data from "./data";
import * as React from "react";
import * as core from "./core";
import * as workspace from "./workspace";
import * as pkg from "./package";
import * as codecard from "./codecard";

import { Button } from "../../react-common/components/controls/Button";
import { SearchInput } from "./components/searchInput";
import { useState, useEffect } from "react";
import { ImportModal } from "../../react-common/components/extensions/ImportModal";
import { Modal } from "../../react-common/components/controls/Modal";

type ExtensionMeta = pxtc.service.ExtensionMeta;
type EmptyCard = { name: string, loading?: boolean }
const emptyCard: EmptyCard = { name: "", loading: true }

interface ExtensionsProps {
    hideExtensions: () => void;
    header: pxt.workspace.Header;
    reloadHeaderAsync: () => Promise<void>;
}

enum TabState {
    Recommended,
    InDevelopment
}

export const ExtensionsBrowser = (props: ExtensionsProps) => {

    const [searchFor, setSearchFor] = useState("");
    const [searchComplete, setSearchComplete] = useState(true)
    const [allExtensions, setAllExtensions] = useState(fetchBundled());
    const [extensionsToShow, setExtensionsToShow] = useState<(ExtensionMeta & EmptyCard)[]>([]);
    const [selectedTag, setSelectedTag] = useState("");
    const [currentTab, setCurrentTab] = useState(TabState.Recommended);
    const [showImportExtensionDialog, setShowImportExtensionDialog] = useState(false);
    const [preferredExts, setPreferredExts] = useState<(ExtensionMeta & EmptyCard)[]>([])
    const [extensionTags, setExtensionTags] = useState(new Map<string, pxt.RepoData[]>())

    useEffect(() => {
        updateExtensionTags();
        updatePreferredExts();
    }, [])

    useEffect(() => {
        if (searchFor && searchFor != "") {
            searchForBundledAndGithubAsync();
        }
    }, [searchFor])

    /**
     * Github search
     */
    async function searchForBundledAndGithubAsync() {
        setSearchComplete(false)
        setExtensionsToShow([emptyCard, emptyCard, emptyCard, emptyCard])
        const exts = await fetchGithubDataAsync([searchFor])
        const parsedExt = exts.map(repo => parseGithubRepo(repo))
        //Search bundled extensions as well
        fetchBundled().forEach(e => {
            if (e.name.toLowerCase().indexOf(searchFor.toLowerCase()) > -1) {
                //Fuzzy search here?
                parsedExt.unshift(e)
            }
        })
        addExtensionsToPool(parsedExt)
        setExtensionsToShow(parsedExt)
        setSearchComplete(true)
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
        // When searching multiple repos at the same time, use 'extension-search' which caches results
        // for much longer than 'gh-search'
        const virtualApi = preferredRepos.length == 1 ? 'gh-search' : 'extension-search';
        return data.getAsync<pxt.github.GitRepo[]>(`${virtualApi}:${preferredRepos.join("|")}`);
    }

    async function fetchGithubDataAndAddAsync(repos: string[]): Promise<ExtensionMeta[]> {
        const fetched = await fetchGithubDataAsync(repos)
        if (!fetched) {
            return []
        }
        const parsed = fetched.map(r => parseGithubRepo(r))
        addExtensionsToPool(parsed)
        return parsed;
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
    }

    function ghName(scr: pxt.github.GitRepo) {
        let n = scr.name.replace(/^pxt-/, "");
        return n;
    }

    function parseGithubRepo(r: pxt.github.GitRepo): ExtensionMeta {
        return {
            name: ghName(r),
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

        const loadingCards = []
        for (let i = 0; i < toBeFetched.length; i++) {
            loadingCards.push(emptyCard)
        }
        setExtensionsToShow([...extensionsWeHave, ...loadingCards]);
        if (toBeFetched.length > 0) {
            const exts = await fetchGithubDataAndAddAsync(toBeFetched)
            setExtensionsToShow([...extensionsWeHave, ...exts])
        }
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
            .filter(pk => !pk.searchOnly || searchFor?.length != 0)
            .filter(pk => pk.name != "core")
            .filter(pk => false == !!pk.core) // show core in "boards" mode
            .filter(pk => !pkg.mainPkg.deps[pk.name] || pkg.mainPkg.deps[pk.name].cppOnly) // don't show package already referenced in extensions
            .sort((a, b) => {
                // core first
                if (a.core != b.core)
                    return a.core ? -1 : 1;

                // non-beta first
                const abeta = pxt.isPkgBeta(a);
                const bbeta = pxt.isPkgBeta(b);
                if (abeta != bbeta)
                    return abeta ? 1 : -1;

                // use weight if core packages
                const aweight = a.weight === undefined ? 50 : a.weight;
                const bweight = b.weight === undefined ? 50 : b.weight;
                if (aweight != bweight)
                    return -aweight + bweight;

                // alphabetical sort
                return pxt.Util.strcmp(a.name, b.name)
            })
            .forEach(e => extensionsMap.set(e.name, packageConfigToExtensionMeta(e)))
        return extensionsMap
    }

    async function updatePreferredExts() {
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

        const exts = await fetchGithubDataAndAddAsync(toBeFetched);
        setPreferredExts([...repos, ...exts])
    }

    async function handleImportUrl(url: string) {
        setShowImportExtensionDialog(false)
        props.hideExtensions()
        const ext = getExtensionFromFetched(url)
        if (!ext) {
            const exts = await fetchGithubDataAndAddAsync([url])
            addExtensionsToPool(exts)
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
    return (
        <Modal
            title={lf("Extensions")}
            fullscreen={true}
            className={"extensions-browser"}
            onClose={props.hideExtensions}
            helpUrl={"/extensions"}
        >
            <div className="ui">
                {showImportExtensionDialog &&
                    <ImportModal
                        onCancelClick={() => setShowImportExtensionDialog(false)}
                        onImportClick={handleImportUrl}
                    />
                }
                <div className="extension-search-header">
                    <SearchInput
                        ariaMessage={searchComplete && lf("{0} results matching '{1}'", extensionsToShow.length, searchFor)}
                        placeholder={lf("Search or enter project URL...")}
                        aria-label={lf("Search or enter project URL...")}
                        searchHandler={setSearchFor} />
                    <div className="extension-tags">
                        {categoryNames.map(c =>
                            <Button title={pxt.Util.rlf(c)}
                                key={c}
                                label={pxt.Util.rlf(c)}
                                onClick={() => handleCategoryClick(c)}
                                onKeydown={() => handleCategoryClick}
                                className={"extension-tag " + (selectedTag == c ? "selected" : "")}
                            />
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
                        <div className="ui cards left">
                            {extensionsToShow?.map((scr, index) =>
                                <ExtensionCard
                                    key={`searched:${index}`}
                                    name={scr.name ?? `${index}`}
                                    description={scr.description}
                                    imageUrl={scr.imageUrl}
                                    scr={scr}
                                    onCardClick={installExtension}
                                    learnMoreUrl={scr.fullName ? `/pkg/${scr.fullName}` : undefined}
                                    loading={scr.loading}
                                    label={pxt.isPkgBeta(scr) ? lf("Beta") : undefined}
                                    role="button"
                                />)}
                        </div>
                        {searchComplete && extensionsToShow.length == 0 &&
                            <div aria-label="Extension search results">
                                <p>{lf("We couldn't find any extensions matching '{0}'", searchFor)}</p>
                            </div>
                        }
                    </div>}
                {displayMode == ExtensionView.Tags &&
                    <div className="extension-display">
                        <div className="breadcrumbs">
                            <span className="link" onClick={handleHomeButtonClick}>{lf("Home")}</span>
                            <span>/</span>
                            <span>{selectedTag}</span>
                        </div>
                        <div className="ui cards left">
                            {extensionsToShow?.map((scr, index) =>
                                <ExtensionCard
                                    key={`tagged:${index}`}
                                    name={scr.name ?? `${index}`}
                                    description={scr.description}
                                    imageUrl={scr.imageUrl}
                                    scr={scr}
                                    onCardClick={installExtension}
                                    learnMoreUrl={scr.fullName ? `/pkg/${scr.fullName}` : undefined}
                                    loading={scr.loading}
                                    label={pxt.isPkgBeta(scr) ? lf("Beta") : undefined}
                                    role="button"
                                />)}
                        </div>
                    </div>}
                {displayMode == ExtensionView.Tabbed &&
                    <div className="extension-display">
                        <div className="tab-header">
                            <Button
                                key={"Recommended"}
                                title={lf("Recommended")}
                                label={lf("Recommended")}
                                onClick={() => { setCurrentTab(TabState.Recommended) }}
                                className={currentTab == TabState.Recommended ? "selected" : ""}
                            />
                            <Button
                                key={"In Development"}
                                title={lf("In Development")}
                                label={lf("In Development")}
                                onClick={() => { setCurrentTab(TabState.InDevelopment) }}
                                className={currentTab == TabState.InDevelopment ? "selected" : ""}
                            />
                        </div>
                        <div className="ui cards left">
                            {currentTab == TabState.Recommended && preferredExts.map((e, index) =>
                                <ExtensionCard
                                    key={`preferred:${index}`}
                                    scr={e}
                                    name={e.name ?? `${index}`}
                                    onCardClick={installExtension}
                                    imageUrl={e.imageUrl}
                                    description={e.description}
                                    learnMoreUrl={e.fullName ? `/pkg/${e.fullName}` : undefined}
                                    loading={e.loading}
                                    label={pxt.isPkgBeta(e) ? lf("Beta") : undefined}
                                    role="button"
                                />
                            )
                            }
                            {currentTab == TabState.InDevelopment && local.forEach((p, index) =>
                                <ExtensionCard
                                    key={`local:${index}`}
                                    name={p.name}
                                    description={lf("Local copy of {0} hosted on github.com", p.githubId)}
                                    url={"https://github.com/" + p.githubId}
                                    imageUrl={p.icon}
                                    scr={p}
                                    onCardClick={addLocal}
                                    label={lf("Local")}
                                    title={lf("Local GitHub extension")}
                                    labelClass="blue right ribbon"
                                    role="button"
                                />
                            )
                            }
                        </div>
                    </div>
                }
            </div>
        </Modal>
    )
}

interface ExtensionCardProps extends pxt.CodeCard {
    scr: pxtc.service.ExtensionMeta;
    onCardClick: (scr: any) => void;
    loading?: boolean;
}

const ExtensionCard = (props: ExtensionCardProps) => {
    const handleClick = () => {
        props.onCardClick(props.scr);
    }

    return <codecard.CodeCardView {...props} onClick={handleClick} key={props.name} />
}
