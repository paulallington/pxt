import { ModalType, ToastWithId, TabName, ProjectData, ConfirmationModalOptions } from "../types";
import { CatalogCriteria, CriteriaResult } from "../types/criteria";
import { Rubric } from "../types/rubric";
import { makeRubric } from "../utils";

export type AppState = {
    targetConfig?: pxt.TargetConfig;
    toasts: ToastWithId[];
    evalResults: pxt.Map<CriteriaResult>; // Criteria Instance Id -> Result
    projectMetadata: ProjectData | undefined;
    catalog: CatalogCriteria[] | undefined;
    rubric: Rubric;
    modal: ModalType | undefined;
    activeTab: TabName;
    validatorPlans: pxt.blocks.ValidatorPlan[] | undefined;
    autorun: boolean;
    confirmationOptions: ConfirmationModalOptions | undefined;
    flags: {
        testCatalog: boolean;
    };
};

export const initialAppState: AppState = {
    toasts: [],
    evalResults: {},
    projectMetadata: undefined,
    catalog: undefined,
    rubric: makeRubric(),
    modal: undefined,
    activeTab: "home",
    validatorPlans: undefined,
    autorun: false,
    confirmationOptions: undefined,
    flags: {
        testCatalog: false,
    },
};
