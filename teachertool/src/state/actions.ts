import { ModalType, ToastWithId, TabName, ProjectData, ConfirmationModalOptions } from "../types";
import { CatalogCriteria, CriteriaResult } from "../types/criteria";
import { Rubric } from "../types/rubric";

// Changes to app state are performed by dispatching actions to the reducer
type ActionBase = {
    type: string;
};

/**
 * Actions
 */
type ShowToast = ActionBase & {
    type: "SHOW_TOAST";
    toast: ToastWithId;
};

type DismissToast = ActionBase & {
    type: "DISMISS_TOAST";
    toastId: string;
};

type SetProjectMetadata = ActionBase & {
    type: "SET_PROJECT_METADATA";
    metadata: ProjectData | undefined;
};

type SetEvalResult = ActionBase & {
    type: "SET_EVAL_RESULT";
    criteriaInstanceId: string;
    result: CriteriaResult;
};

type ClearEvalResult = ActionBase & {
    type: "CLEAR_EVAL_RESULT";
    criteriaInstanceId: string;
};

type ClearAllEvalResults = ActionBase & {
    type: "CLEAR_ALL_EVAL_RESULTS";
};

type SetTargetConfig = ActionBase & {
    type: "SET_TARGET_CONFIG";
    config: pxt.TargetConfig;
};

type SetCatalog = ActionBase & {
    type: "SET_CATALOG";
    catalog: CatalogCriteria[] | undefined;
};

type SetRubric = ActionBase & {
    type: "SET_RUBRIC";
    rubric: Rubric;
};

type SetConfirmationOptions = ActionBase & {
    type: "SET_CONFIRMATION_OPTIONS";
    options: ConfirmationModalOptions | undefined;
};

type ShowModal = ActionBase & {
    type: "SHOW_MODAL";
    modal: ModalType;
};

type HideModal = ActionBase & {
    type: "HIDE_MODAL";
};

type SetValidatorPlans = ActionBase & {
    type: "SET_VALIDATOR_PLANS";
    plans: pxt.blocks.ValidatorPlan[] | undefined;
};

type SetActiveTab = ActionBase & {
    type: "SET_ACTIVE_TAB";
    tabName: TabName;
};

type SetAutorun = ActionBase & {
    type: "SET_AUTORUN";
    autorun: boolean;
};

type SetEvalResultsBatch = ActionBase & {
    type: "SET_EVAL_RESULTS_BATCH";
    criteriaResults: pxt.Map<CriteriaResult>;
};

type ClearAllEvalResultNotes = ActionBase & {
    type: "CLEAR_ALL_EVAL_RESULT_NOTES";
};

/**
 * Union of all actions
 */

export type Action =
    | ShowToast
    | DismissToast
    | SetProjectMetadata
    | SetEvalResult
    | ClearEvalResult
    | ClearAllEvalResults
    | ClearAllEvalResultNotes
    | SetEvalResultsBatch
    | SetTargetConfig
    | SetCatalog
    | SetRubric
    | SetConfirmationOptions
    | ShowModal
    | HideModal
    | SetValidatorPlans
    | SetActiveTab
    | SetAutorun;

/**
 * Action creators
 */
const showToast = (toast: ToastWithId): ShowToast => ({
    type: "SHOW_TOAST",
    toast,
});

const dismissToast = (toastId: string): DismissToast => ({
    type: "DISMISS_TOAST",
    toastId,
});

const setProjectMetadata = (metadata: ProjectData | undefined): SetProjectMetadata => ({
    type: "SET_PROJECT_METADATA",
    metadata,
});

const setEvalResult = (criteriaInstanceId: string, result: CriteriaResult): SetEvalResult => ({
    type: "SET_EVAL_RESULT",
    criteriaInstanceId,
    result,
});

const clearEvalResult = (criteriaInstanceId: string): ClearEvalResult => ({
    type: "CLEAR_EVAL_RESULT",
    criteriaInstanceId,
});

const clearAllEvalResults = (): ClearAllEvalResults => ({
    type: "CLEAR_ALL_EVAL_RESULTS",
});

const setTargetConfig = (config: pxt.TargetConfig): SetTargetConfig => ({
    type: "SET_TARGET_CONFIG",
    config,
});

const setCatalog = (catalog: CatalogCriteria[] | undefined): SetCatalog => ({
    type: "SET_CATALOG",
    catalog,
});

const setRubric = (rubric: Rubric): SetRubric => ({
    type: "SET_RUBRIC",
    rubric,
});

const setConfirmationOptions = (options: ConfirmationModalOptions | undefined): SetConfirmationOptions => ({
    type: "SET_CONFIRMATION_OPTIONS",
    options,
});

const showModal = (modal: ModalType): ShowModal => ({
    type: "SHOW_MODAL",
    modal,
});

const hideModal = (): HideModal => ({
    type: "HIDE_MODAL",
});

const setValidatorPlans = (plans: pxt.blocks.ValidatorPlan[] | undefined): SetValidatorPlans => ({
    type: "SET_VALIDATOR_PLANS",
    plans,
});

const setActiveTab = (tabName: TabName): SetActiveTab => ({
    type: "SET_ACTIVE_TAB",
    tabName,
});

const setAutorun = (autorun: boolean): SetAutorun => ({
    type: "SET_AUTORUN",
    autorun,
});

const setEvalResultsBatch = (criteriaResults: pxt.Map<CriteriaResult>): SetEvalResultsBatch => ({
    type: "SET_EVAL_RESULTS_BATCH",
    criteriaResults,
});

const clearAllEvalResultNotes = (): ClearAllEvalResultNotes => ({
    type: "CLEAR_ALL_EVAL_RESULT_NOTES",
});

export {
    showToast,
    dismissToast,
    setProjectMetadata,
    setEvalResult,
    clearEvalResult,
    clearAllEvalResults,
    clearAllEvalResultNotes,
    setEvalResultsBatch,
    setTargetConfig,
    setCatalog,
    setRubric,
    setConfirmationOptions,
    showModal,
    hideModal,
    setValidatorPlans,
    setActiveTab,
    setAutorun,
};
