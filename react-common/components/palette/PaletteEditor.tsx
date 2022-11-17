import * as React from "react";
import { Modal } from "../controls/Modal";
import { ColorPickerField } from "./ColorPickerField";
import { Palette } from "./Palettes";

export interface PaletteEditorProps {
    palette: Palette;
    onPaletteChanged: (newPalette: Palette) => void;
}

export const PaletteEditor = (props: PaletteEditorProps) => {
    const { palette, onPaletteChanged } = props;

    const [currentPalette, setCurrentPalette] = React.useState<Palette | undefined>(undefined);

    const updateColor = (index: number, newColor: string) => {
        const toUpdate = currentPalette || palette;
        setCurrentPalette({
            ...toUpdate,
            colors: toUpdate.colors.map((c, i) =>
                index === i ? newColor : c
            )
        });
    }

    const moveColor = (index: number, up: boolean) => {
        const toUpdate = currentPalette || palette;
        const res = {
            ...toUpdate,
            colors: toUpdate.colors.slice()
        };

        if (up) {
            if (index > 1) {
                res.colors[index - 1] = toUpdate.colors[index];
                res.colors[index] = toUpdate.colors[index - 1];
            }
        }
        else {
            if (index < res.colors.length - 1) {
                res.colors[index + 1] = toUpdate.colors[index];
                res.colors[index] = toUpdate.colors[index + 1];
            }
        }
        setCurrentPalette(res);
    }

    const onClose = () => {
        onPaletteChanged(currentPalette || palette);
    }

    return <Modal title={lf("Edit Palette")} onClose={onClose}>
        <div className="common-palette-editor">
            {(currentPalette || palette).colors.map((c, i) =>
                <ColorPickerField
                    key={i}
                    index={i}
                    color={c}
                    onColorChanged={newColor => updateColor(i, newColor)}
                    onMoveColor={up => moveColor(i, up)}
                    disabled={i === 0}
                />
            )}
        </div>
    </Modal>
}