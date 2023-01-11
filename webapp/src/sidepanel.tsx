/// <reference path="../../built/pxtlib.d.ts" />

import * as React from "react";
import * as data from "./data";
import * as filelist from "./filelist";
import * as keymap from "./keymap";
import * as serialindicator from "./serialindicator"
import * as simtoolbar from "./simtoolbar";
import * as simulator from "./simulator";

import { Button } from "./sui";
import { TabContent } from "./components/core/TabContent";
import { TabPane } from "./components/core/TabPane";
import { TutorialContainer } from "./components/tutorial/TutorialContainer";
import { fireClickOnEnter } from "./util";

interface SidepanelState {
    activeTab?: string;
    height?: number;
}

interface SidepanelProps extends pxt.editor.ISettingsProps {
    inHome: boolean;
    showKeymap?: boolean;
    showSerialButtons?: boolean;
    showFileList?: boolean;
    showFullscreenButton?: boolean;
    showHostMultiplayerGameButton?: boolean;
    collapseEditorTools?: boolean;
    simSerialActive?: boolean;
    deviceSerialActive?: boolean;
    tutorialOptions?: pxt.tutorial.TutorialOptions;
    onTutorialStepChange?: (step: number) => void;
    onTutorialComplete?: () => void;
    setEditorOffset?: () => void;
    showMiniSim: (visible?: boolean) => void;
    openSerial: (isSim: boolean) => void;
    handleHardwareDebugClick: () => void;
    handleFullscreenButtonClick: () => void;
}

const TUTORIAL_TAB = "tab-tutorial";
const SIMULATOR_TAB = "tab-simulator";

export class Sidepanel extends data.Component<SidepanelProps, SidepanelState> {
    protected simPanelRef: HTMLDivElement;
    constructor(props: SidepanelProps) {
        super(props);
    }

    UNSAFE_componentWillReceiveProps(props: SidepanelProps) {
        // This is necessary because we are not properly mounting and
        // unmounting the component as we enter/exit the editor. We
        // instead manually reset the state as we transition.
        if ((!this.props.tutorialOptions && props.tutorialOptions)
            || (this.props.inHome && !props.inHome && props.tutorialOptions)
            || (this.props.tutorialOptions?.tutorial && props.tutorialOptions?.tutorial
                && this.props.tutorialOptions.tutorial !== props.tutorialOptions.tutorial)) {
            this.showTutorialTab();
        } else if (!this.props.inHome && props.inHome
            || (this.props.tutorialOptions && !props.tutorialOptions)) {
            this.showSimulatorTab();
        }
    }

    componentDidUpdate(props: SidepanelProps, state: SidepanelState) {
        if ((this.state.height || state.height) && this.state.height != state.height) this.props.setEditorOffset();
    }


    protected tryShowSimulatorTab = () => {
        const isTabTutorial = this.props.tutorialOptions?.tutorial && !pxt.BrowserUtils.useOldTutorialLayout();
        const hasSimulator = !pxt.appTarget.simulator?.headless;
        const includeSimulatorTab = !isTabTutorial && hasSimulator;
        if (includeSimulatorTab) {
            this.showSimulatorTab();
        }
    }

    protected showSimulatorTab = () => {
        this.props.showMiniSim(false);
        this.setState({ activeTab: SIMULATOR_TAB, height: undefined });
        simulator.driver.focus();
    }

    protected tryShowTutorialTab = () => {
        const isTabTutorial = this.props.tutorialOptions?.tutorial && !pxt.BrowserUtils.useOldTutorialLayout();
        if (isTabTutorial) {
            this.showTutorialTab();
        }
    }

    protected showTutorialTab = () => {
        this.props.showMiniSim(true);
        this.setState({ activeTab: TUTORIAL_TAB });
    }

    protected handleSimSerialClick = () => {
        this.props.openSerial(true);
    }

    protected handleDeviceSerialClick = () => {
        this.props.openSerial(false);
    }

    protected handleSimOverlayClick = () => {
        const { tutorialOptions, handleFullscreenButtonClick } = this.props;
        if (!tutorialOptions || pxt.BrowserUtils.useOldTutorialLayout()) {
            handleFullscreenButtonClick();
        } else {
            this.tryShowSimulatorTab();
        }
    }

    protected handleSimPanelRef = (c: HTMLDivElement) => {
        this.simPanelRef = c;
        if (c && typeof ResizeObserver !== "undefined") {
            const observer = new ResizeObserver(() => {
                const scrollVisible = c.scrollHeight > c.clientHeight;
                if (scrollVisible)
                    this.simPanelRef?.classList.remove("invisibleScrollbar");
                else
                    this.simPanelRef?.classList.add("invisibleScrollbar");
            })
            observer.observe(c);
        }
    }

    protected setComponentHeight = (height?: number) => {
        if (height != this.state.height) this.setState({ height });
    }

    onHostMultiplayerGameClick = (evt: any) => {
        evt.preventDefault();
        pxt.tickEvent("sidepanel.hostmultiplayergame");
        this.props.parent.showShareDialog(undefined, true);
    }

    renderCore() {
        const { parent, inHome, showKeymap, showSerialButtons, showFileList, showFullscreenButton, showHostMultiplayerGameButton,
            collapseEditorTools, simSerialActive, deviceSerialActive, tutorialOptions,
            handleHardwareDebugClick, onTutorialStepChange, onTutorialComplete } = this.props;
        const { activeTab, height } = this.state;

        const isTabTutorial = tutorialOptions?.tutorial && !pxt.BrowserUtils.useOldTutorialLayout();
        const isLockedEditor = pxt.appTarget.appTheme.lockedEditor;
        const hasSimulator = !pxt.appTarget.simulator?.headless;
        const includeSimulatorTab = !isTabTutorial && hasSimulator
        const marginHeight = includeSimulatorTab ? "6.5rem" : "3rem";

        const backButton = <Button icon="arrow circle left" text={lf("Back")} onClick={this.tryShowTutorialTab} />;
        const nextButton = <Button icon="arrow circle right" text={lf("Next")} onClick={this.tryShowTutorialTab} />;

        return <div id="simulator" className="simulator">
            {!hasSimulator && <div id="boardview" className="headless-sim" role="region" aria-label={lf("Simulator")} tabIndex={-1} />}
            <TabPane id="editorSidebar" activeTabName={activeTab} style={height ? { height: `calc(${height}px + ${marginHeight})` } : undefined}>
                <TabContent disabled={!includeSimulatorTab} name={SIMULATOR_TAB} icon="xicon gamepad" onSelected={this.tryShowSimulatorTab} ariaLabel={lf("Open the simulator tab")}>
                    <div className="ui items simPanel" ref={this.handleSimPanelRef}>
                        <div id="boardview" className="ui vertical editorFloat" role="region" aria-label={lf("Simulator")} tabIndex={inHome ? -1 : 0} />
                        <simtoolbar.SimulatorToolbar parent={parent} collapsed={collapseEditorTools} simSerialActive={simSerialActive} devSerialActive={deviceSerialActive} showSimulatorSidebar={this.tryShowSimulatorTab} />
                        {showKeymap && <keymap.Keymap parent={parent} />}
                        <div className="ui item portrait hide hidefullscreen">
                            {pxt.options.debug && <Button key="hwdebugbtn" className="teal" icon="xicon chip" text={"Dev Debug"} onClick={handleHardwareDebugClick} />}
                        </div>
                        {showHostMultiplayerGameButton && <Button className={"teal hostmultiplayergame-button portrait hide hidefullscreen"} icon={"xicon multiplayer"} text={lf("Host multiplayer game")} ariaLabel={lf("Host multiplayer game")} onClick={this.onHostMultiplayerGameClick} />}
                        {showSerialButtons && <div id="serialPreview" className="ui editorFloat portrait hide hidefullscreen">
                            <serialindicator.SerialIndicator ref="simIndicator" isSim={true} onClick={this.handleSimSerialClick} parent={parent} />
                            <serialindicator.SerialIndicator ref="devIndicator" isSim={false} onClick={this.handleDeviceSerialClick} parent={parent} />
                        </div>}

                        {showFileList && <filelist.FileList parent={parent} />}
                        {showFullscreenButton && <div id="miniSimOverlay" role="button" title={lf("Open in fullscreen")} onClick={this.handleSimOverlayClick} />}
                    </div>
                    {isTabTutorial && <div className="tutorial-controls">
                        { backButton }
                        <Button icon="lightbulb" disabled={true} className="tutorial-hint" />
                        { nextButton }
                    </div>}
                </TabContent>
                {tutorialOptions && <TabContent name={TUTORIAL_TAB} icon="icon tasks" showBadge={activeTab !== TUTORIAL_TAB} onSelected={this.tryShowTutorialTab} ariaLabel={lf("Open the tutorial tab")}>
                    <TutorialContainer
                        parent={parent}
                        tutorialId={tutorialOptions.tutorial}
                        name={tutorialOptions.tutorialName}
                        steps={tutorialOptions.tutorialStepInfo}
                        currentStep={tutorialOptions.tutorialStep}
                        tutorialOptions={tutorialOptions}
                        hideIteration={tutorialOptions.metadata?.hideIteration}
                        hasTemplate={!!tutorialOptions.templateCode}
                        preferredEditor={tutorialOptions.metadata?.preferredEditor}
                        onTutorialStepChange={onTutorialStepChange}
                        onTutorialComplete={onTutorialComplete}
                        setParentHeight={this.setComponentHeight} />
                </TabContent>}
            </TabPane>
        </div>
    }
}
