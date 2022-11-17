
const staffNoteIntervals = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19];

export function rowToNote(octave: number, row: number, isSharp?: boolean) {
    return staffNoteIntervals[row] + octave * 12 + 1 + (isSharp ? 1 : 0)
}

export function noteToRow(octave: number, note: number) {
    const offset = note - 1 - octave * 12;

    for (let i = 0; i < staffNoteIntervals.length; i++) {
        if (staffNoteIntervals[i] === offset) {
            return i;
        }
        else if (staffNoteIntervals[i] > offset) {
            // sharp note
            return i - 1;
        }
    }

    return -1;
}

export function isSharpNote(note: number) {
    const offset = (note - 1) % 12;

    return staffNoteIntervals.indexOf(offset) === -1;
}


export function addNoteToTrack(song: pxt.assets.music.Song, trackIndex: number, note: number, startTick: number, endTick: number) {
    return {
        ...song,
        tracks: song.tracks.map((track, index) => index !== trackIndex ? track : {
            ...track,
            notes: addToNoteArray(track.notes, note, startTick, endTick)
        })
    }
}

function addToNoteArray(notes: pxt.assets.music.NoteEvent[], note: number, startTick: number, endTick: number) {
    const noteEvent: pxt.assets.music.NoteEvent = {
        notes: [note],
        startTick,
        endTick
    };

    for (let i = 0; i < notes.length; i++) {
        if (notes[i].startTick > startTick) {
            return notes.slice(0, i).concat([noteEvent]).concat(notes.slice(i));
        }
        else if (notes[i].endTick > startTick) {
            if (notes[i].notes.indexOf(note) !== -1) {
                return notes.slice();
            }

            return notes.map((event, index) => index !== i ? event : {
                ...event,
                notes: event.notes.concat([note])
            })
        }
    }
    return notes.slice().concat([noteEvent]);
}


export function removeNoteFromTrack(song: pxt.assets.music.Song, trackIndex: number, note: number, startTick: number) {
    return {
        ...song,
        tracks: song.tracks.map((track, index) => index !== trackIndex ? track : {
            ...track,
            notes: removeNoteFromNoteArray(track.notes, note, startTick)
        })
    }
}

function removeNoteFromNoteArray(notes: pxt.assets.music.NoteEvent[], note: number, startTick: number) {
    const res = notes.slice();

    for (let i = 0; i < res.length; i++) {
        if (res[i].startTick == startTick) {
            res[i] = {
                ...res[i],
                notes: res[i].notes.filter(n => n !== note)
            }
            break;
        }
    }
    return res.filter(e => e.notes.length);
}

export function editNoteEventLength(song: pxt.assets.music.Song, trackIndex: number, startTick: number, endTick: number) {
    return {
        ...song,
        tracks: song.tracks.map((track, index) => index !== trackIndex ? track : {
            ...track,
            notes: setNoteEventLength(track.notes, startTick, endTick)
        })
    }
}

function setNoteEventLength(notes: pxt.assets.music.NoteEvent[], startTick: number, endTick: number) {
    const res = notes.slice();
    if (startTick >= endTick) return res;

    let newNoteEvent: pxt.assets.music.NoteEvent;

    for (let i = 0; i < res.length; i++) {
        if (res[i].startTick === startTick) {
            newNoteEvent = {
                ...res[i],
                endTick: endTick
            }
            res[i] = newNoteEvent
        }
        else if (newNoteEvent && res[i].startTick < newNoteEvent.endTick) {
            res[i] = undefined;
        }
    }
    return res.filter(e => !!e);
}

export function fillDrums(song: pxt.assets.music.Song, trackIndex: number, row: number, startTick: number, endTick: number, tickSpacing: number) {
    for (let i = startTick; i < endTick; i += tickSpacing) {
        song = addNoteToTrack(song, trackIndex, row, i, i + 1)
    }
    return song;
}

export function findNoteEventAtTick(song: pxt.assets.music.Song, trackIndex: number, tick: number) {
    const track = song.tracks[trackIndex];

    for (const note of track.notes) {
        if (note.startTick <= tick && note.endTick > tick) {
            return note;
        }
    }

    return undefined;
}

export function findClosestPreviousNote(song: pxt.assets.music.Song, trackIndex: number, tick: number) {
    const track = song.tracks[trackIndex];

    let lastNote: pxt.assets.music.NoteEvent;
    for (const note of track.notes) {
        if (note.startTick > tick) {
            return lastNote;
        }
        lastNote = note;
    }

    return lastNote;
}


export function changeSongLength(song: pxt.assets.music.Song, measures: number) {
    const maxTick = measures * song.beatsPerMeasure * song.ticksPerBeat;

    return {
        ...song,
        measures,
        tracks: song.tracks.map(t => {
            const res = {
                ...t,
                notes: t.notes.slice()
            }


            res.notes = res.notes.filter(e => e.startTick < maxTick);
            res.notes = res.notes.map(e => ({
                ...e,
                endTick: Math.min(e.endTick, maxTick)
            }));

            return res;
        })
    }
}
