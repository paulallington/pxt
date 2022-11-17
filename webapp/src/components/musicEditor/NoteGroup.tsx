import * as React from "react";
import { Note } from "./Note";
import { addPlaybackStopListener, addTickListener, removePlaybackStopListener, removeTickListener } from "./playback";
import { tickToX } from "./svgConstants";
import { isSharpNote, noteToRow } from "./utils";

export interface NoteGroupProps {
    song: pxt.assets.music.Song;
    octave: number;
    noteEvent: pxt.assets.music.NoteEvent;
    iconURI: string;
    isDrumTrack: boolean;
}

export const NoteGroup = (props: NoteGroupProps) => {
    const { song, noteEvent, octave, iconURI, isDrumTrack } = props;

    let noteGroupRef: SVGGElement;

    const playingClass = "music-note-playing";

    React.useEffect(() => {
        let isPlaying = false;

        const onTick = (tick: number) => {
            if (tick >= noteEvent.startTick && tick < noteEvent.endTick) {
                if (!isPlaying) {
                    isPlaying = true;
                    noteGroupRef.classList.add(playingClass);
                    const anims = noteGroupRef.querySelectorAll("animate");
                    for (let i = 0; i < anims.length; i++) {
                        anims.item(i).beginElement();
                    }
                }
            }
            else if (isPlaying) {
                isPlaying = false;
                noteGroupRef.classList.remove(playingClass);
            }
        }

        const onStop = () => {
            if (isPlaying) {
                isPlaying = false;
                noteGroupRef.classList.remove(playingClass);
            }
        }


        addTickListener(onTick);
        addPlaybackStopListener(onStop);

        return () => {
            removeTickListener(onTick);
            removePlaybackStopListener(onStop);
            noteGroupRef.classList.remove(playingClass);
        }
    }, [noteEvent])


    const handleNoteGroupRef = (ref: SVGGElement) => {
        if (ref) noteGroupRef = ref;
    }

    const xOffset = tickToX(song, noteEvent.startTick)
    const noteLength = isDrumTrack ? 0 : tickToX(song, noteEvent.endTick) - xOffset;

    return <g className="music-staff-note-group" transform={`translate(${xOffset}, 0)`} ref={handleNoteGroupRef}>
        {noteEvent.notes.map((note, index) => {
            const row = isDrumTrack ? note : noteToRow(octave, note);
            const isSharp = isDrumTrack ? false : isSharpNote(note);
            return <Note
                key={index}
                row={row}
                isSharp={isSharp}
                iconURI={iconURI}
                length={noteLength} />
        }
        )}
    </g>
}