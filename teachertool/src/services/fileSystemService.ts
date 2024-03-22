import { logError } from "../services/loggingService";
import { ErrorCode } from "../types/errorCode";
import { Rubric } from "../types/rubric";

// Serializes the active rubric and writes it to a file.
// Returns true if the file was written successfully, false otherwise.
export function writeRubricToFile(rubric: Rubric): boolean {
    const sanitizedName = rubric.name ? pxt.Util.sanitizeFileName(rubric.name) : "";
    const fileName = `${sanitizedName ? sanitizedName : lf("unnamed-rubric")}.json`;

    // Write content to the given path on disk.
    const rubricJson = JSON.stringify(rubric, null, 4);

    try {
        pxt.BrowserUtils.browserDownloadText(rubricJson, fileName);
        return true;
    } catch (error) {
        logError(ErrorCode.unableToExportRubric, error);
        return false;
    }
}

export async function loadRubricFromFileAsync(file: File): Promise<Rubric | undefined> {
    let rubric: Rubric | undefined = undefined;

    try {
        const rubricJson = await pxt.Util.fileReadAsTextAsync(file);
        rubric = JSON.parse(rubricJson) as Rubric;
    } catch (error) {
        logError(ErrorCode.unableToReadRubricFile, error);
    }
    return rubric;
}
