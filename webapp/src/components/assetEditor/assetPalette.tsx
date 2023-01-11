import * as pkg from "../../package";
import { useEffect, useState } from "react";
import { Modal, ModalAction } from "../../../../react-common/components/controls/Modal";
import { Input } from "../../../../react-common/components/controls/Input";
import { PalettePicker } from "../../../../react-common/components/palette/PalettePicker";
import { PaletteEditor } from "../../../../react-common/components/palette/PaletteEditor";
import { AllPalettes as BuiltinPalettes, Arcade, Palette } from "../../../../react-common/components/palette/Palettes";


export interface CustomPalettes {
    nextPaletteID: number;
    palettes: pxt.Map<Palette>;
}
export interface AssetPaletteProps {
    onClose: (paletteChanged: boolean) => void;
}

export const AssetPalette = (props: AssetPaletteProps) => {
    const { onClose } = props;
    const [customPalettes, setCustomPalettes] = useState<CustomPalettes>(undefined);
    const [initialPalette, setInitialPalette] = useState<Palette | undefined>(undefined);
    const [currentPalette, setCurrentPalette] = useState<Palette | undefined>(undefined);
    const [showExitModal, setShowExitModal] = useState<boolean>(false);
    const [showNameModal, setShowNameModal] = useState<boolean>(false);
    const [invalidName, setInvalidName] = useState<boolean>(false);
    const [disableButtons, setDisableButtons] = useState<boolean>(true);

    useEffect(() => {
        initializePalettes();
    }, []);

    useEffect(() => {
        if (currentPalette && !isSameColors(currentPalette.colors, initialPalette.colors)) {
            setDisableButtons(false);
        } else {
            setDisableButtons(true);
        }
    }, [currentPalette]);

    const onPaletteEdit = (selected: Palette) => {
        if (currentPalette && !isSameColors(currentPalette.colors, selected.colors)) {
            if (selected.id !== currentPalette.id) { // palette selected
                setCurrentPalette(selected);
            } else if (isBuiltinPalette(selected)) { // builtin palette edited
                // create new custom palette and prompt user to name custom palette
                const customPalette = {
                    id: "custom" + customPalettes.nextPaletteID,
                    name: lf("Custom Palette"),
                    colors: selected.colors,
                    custom: true
                }
                setCustomPalettes({
                    ...customPalettes,
                    nextPaletteID: ++customPalettes.nextPaletteID,
                    palettes: {
                        ...customPalettes.palettes,
                        [customPalette.id]: customPalette
                    }
                });
                setCurrentPalette(customPalette);
                setShowNameModal(true);
            } else { // custom palette edited
                setCustomPalettes({
                    ...customPalettes,
                    palettes: {
                        ...customPalettes.palettes,
                        [currentPalette.id]: selected
                    }
                });
                setCurrentPalette(selected);
            }
        }
    }

    const onFinalClose = (paletteChanged: boolean) => {
        pkg.mainEditorPkg().setFile(pxt.PALETTES_FILE, JSON.stringify(customPalettes, undefined, 4));
        if (paletteChanged) {
            pxt.tickEvent("palette.modified", {id: currentPalette.id})
            // save pxt.json
            pkg.mainEditorPkg().updateConfigAsync(cfg => cfg.palette = currentPalette.colors);
        }
        onClose(paletteChanged);
    }

    const onModalClose = () => {
        // check whether exiting without applied changes
        if (isSameColors(currentPalette.colors, initialPalette.colors)) {
            onFinalClose(false);
        } else {
            setShowExitModal(true);
        }
    }

    const onExit = () => {
        setShowExitModal(false);
        onFinalClose(false);
    }

    const onReset = () => {
        setCurrentPalette(initialPalette);
    }

    const onApply = () => {
        onFinalClose(true);
    }

    const onGoBack = () => {
        setShowExitModal(false);
    }

    const onNameDone = () => {
        setShowNameModal(false);
        setInvalidName(false);
    }

    const setName = (name: string) => {
        name = name.trim();
        if (name.length === 0) {
            setInvalidName(true);
            return
        } else {
            setInvalidName(false);
        }
        setCustomPalettes({
            ...customPalettes,
            palettes: {
                ...customPalettes.palettes,
                [currentPalette.id]: {
                    ...currentPalette,
                    name: name
                }
            }
        });
        setCurrentPalette({ ...currentPalette, name: name });
    }

    const isSameColors = (colorSet1: string[], colorSet2: string[]) => {
        let isEqual = true;
        for (let i = 0; i < colorSet1.length; i++) {
            if (colorSet1[i].toLowerCase() !== colorSet2[i].toLowerCase()) {
                isEqual = false;
                break;
            }
        }
        return isEqual;
    }

    const initializePalettes = () => {
        const f = pkg.mainEditorPkg().lookupFile("this/" + pxt.PALETTES_FILE);
        let initialCustomPalettes: CustomPalettes = undefined;
        if (f) {
            initialCustomPalettes = JSON.parse(f.content) as CustomPalettes;
        } else {
            initialCustomPalettes = {nextPaletteID: 0, palettes: {}};
        }
        const paletteOptions = Object.values(initialCustomPalettes?.palettes).concat(BuiltinPalettes);
        const colors = pkg.mainPkg.config.palette || pxt.appTarget.runtime.palette;
        let match = false;
        for (const palette of paletteOptions) {
            if (isSameColors(colors, palette.colors)) {
                match = true;
                setInitialPalette(palette);
                setCurrentPalette(palette);
                break;
            }
        }
        if (!match) {
            const customPalette = {
                id: "custom" + initialCustomPalettes.nextPaletteID++,
                name: lf("Custom Palette"),
                colors: colors,
                custom: true
            }
            initialCustomPalettes.palettes[customPalette.id] = customPalette;
            setInitialPalette(customPalette);
            setCurrentPalette(customPalette);
        }
        setCustomPalettes(initialCustomPalettes);
    }

    const isBuiltinPalette = (palette: Palette) => {
        return BuiltinPalettes.some(p => p.id === palette.id);
    }

    if (!customPalettes) {
        return <div />
    }

    const definedPalettes = Object.values(customPalettes.palettes).filter(p => p !== undefined);
    const paletteOptions = definedPalettes.reverse().concat(BuiltinPalettes);

    const actions: ModalAction[] = [
        { label: lf("Reset"), onClick: onReset, leftIcon: 'icon undo', className: 'palette-transparent-button', disabled: disableButtons },
        { label: lf("Apply"), onClick: onApply, className: 'green palette-apply-button', disabled: disableButtons }
    ];

    const exitActions: ModalAction[] = [
        { label: lf("Exit"), onClick: onExit, className: 'teal' }
    ];

    const nameActions: ModalAction[] = [
        { label: lf("Done"), onClick: onNameDone, className: 'teal palette-done-button', disabled: invalidName }
    ];

    return <div>
        <Modal title={lf("Project Color Palette")} onClose={onModalClose} actions={actions}>
            <div className="common-palette-picker">
                <PalettePicker
                    palettes={paletteOptions}
                    selectedId={currentPalette?.id || Arcade.id}
                    onPaletteSelected={onPaletteEdit} />
            </div>
            <PaletteEditor palette={currentPalette || Arcade} onPaletteChanged={onPaletteEdit} />
        </Modal>
        {showExitModal && <Modal title={lf("Exit Without Applying Changes?")} onClose={onGoBack} actions={exitActions}>
            <div>{lf("Your palette changes will be reverted.")}</div>
        </Modal>}
        {showNameModal && <Modal title={lf("Name Your Custom Palette")} onClose={onNameDone} actions={nameActions}>
            <Input
                className="palette-name-input"
                initialValue={invalidName ? "" : currentPalette.name}
                placeholder={lf("Palette Name")}
                onBlur={setName}
                onEnterKey={setName} />
            {invalidName && <p className="invalid-palette-name">{lf("Name must not be empty")}</p>}
        </Modal>}
    </div>
}