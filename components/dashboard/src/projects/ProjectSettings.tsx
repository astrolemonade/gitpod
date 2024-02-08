/**
 * Copyright (c) 2021 Gitpod GmbH. All rights reserved.
 * Licensed under the GNU Affero General Public License (AGPL).
 * See License.AGPL.txt in the project root for license information.
 */

import { PrebuildSettings, Project, ProjectSettings } from "@gitpod/gitpod-protocol";
import { useCallback, useContext, useState, Fragment, useMemo, useEffect } from "react";
import { useHistory } from "react-router";
import { CheckboxInputField } from "../components/forms/CheckboxInputField";
import { PageWithSubMenu } from "../components/PageWithSubMenu";
import { getGitpodService } from "../service/service";
import { ProjectContext, useCurrentProject } from "./project-context";
import { getProjectSettingsMenu, getProjectTabs } from "./projects.routes";
import { Heading2, Subheading } from "../components/typography/headings";
import { RemoveProjectModal } from "./RemoveProjectModal";
import SelectWorkspaceClassComponent from "../components/SelectWorkspaceClassComponent";
import { TextInputField } from "../components/forms/TextInputField";
import { useRefreshAllProjects } from "../data/projects/list-all-projects-query";
import { useToast } from "../components/toasts/Toasts";
import classNames from "classnames";
import { InputField } from "../components/forms/InputField";
import { SelectInputField } from "../components/forms/SelectInputField";
import debounce from "lodash.debounce";
import { Button } from "@podkit/buttons/Button";
import { ErrorCodes } from "@gitpod/gitpod-protocol/lib/messaging/error";
import { PartialMessage } from "@bufbuild/protobuf";
import { RepositoryUnauthorizedError } from "@gitpod/public-api/lib/gitpod/v1/error_pb";
import { openAuthorizeWindow } from "../provider-utils";
import { LinkButton } from "../components/LinkButton";
import { useWorkspaceClasses } from "../data/workspaces/workspace-classes-query";
import { LoadingButton } from "@podkit/buttons/LoadingButton";
import { SwitchInputField } from "@podkit/switch/Switch";
import { useIsOwner } from "../data/organizations/members-query";
// import { useOrgSettingsQuery } from "../data/organizations/org-settings-query";
import { useProjectSettingsQuery } from "../data/projects/project-settings-query";
import { LoadingState } from "@podkit/loading/LoadingState";

const MAX_PROJECT_NAME_LENGTH = 100;

export function ProjectSettingsPage(props: { project?: Project; children?: React.ReactNode }) {
    return (
        <PageWithSubMenu
            subMenu={getProjectSettingsMenu(props.project)}
            title={props.project?.name || "Loading..."}
            subtitle="Manage project settings and configuration"
            tabs={getProjectTabs(props.project)}
        >
            {props.children}
        </PageWithSubMenu>
    );
}

export default function ProjectSettingsView() {
    const { setProject } = useContext(ProjectContext);
    const { project } = useCurrentProject();
    const isOwner = useIsOwner();
    const [showRemoveModal, setShowRemoveModal] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [projectName, internalSetProjectName] = useState(project?.name || "");
    if (!projectName && project && !isDirty) {
        internalSetProjectName(project.name);
    }
    let badProjectName: string | undefined;
    if (project) {
        badProjectName = projectName.length > 0 ? undefined : "Project name can not be blank.";
        if (projectName.length > MAX_PROJECT_NAME_LENGTH) {
            badProjectName = `Project name can not be longer than ${MAX_PROJECT_NAME_LENGTH} characters.`;
        }
    }
    const history = useHistory();
    const refreshProjects = useRefreshAllProjects();
    const { toast, dismissToast } = useToast();
    const [prebuildBranchPattern, setPrebuildBranchPattern] = useState("");

    useEffect(() => {
        if (!project) {
            return;
        }
        setPrebuildBranchPattern(project?.settings?.prebuilds?.branchMatchingPattern || "");
    }, [project]);

    const setProjectName = useCallback(
        (projectName: string) => {
            setIsDirty(true);
            internalSetProjectName(projectName);
        },
        [setIsDirty, internalSetProjectName],
    );

    const updateProjectName = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            if (!project || badProjectName) return;

            await getGitpodService().server.updateProjectPartial({ id: project.id, name: projectName });
            setProject({ ...project, name: projectName });
            refreshProjects(project.teamId);
            toast(`Project ${projectName} updated.`);
        },
        [project, badProjectName, projectName, setProject, refreshProjects, toast],
    );

    const authorizeWithProvider = useCallback(
        async (host: string, scopes: string[], toastId: string) => {
            await openAuthorizeWindow({
                host,
                scopes,
                onSuccess: async () => {
                    dismissToast(toastId);
                    toast("Authorization successful. Please try enabling prebuilds again.");
                },
                onError: (payload) => {
                    let errorMessage: string;
                    if (typeof payload === "string") {
                        errorMessage = payload;
                    } else {
                        errorMessage = payload.description ? payload.description : `Error: ${payload.error}`;
                    }

                    toast(errorMessage || `Oh no, there was a problem with ${host}.`);
                },
            });
        },
        [dismissToast, toast],
    );

    const updateProjectSettings = useCallback(
        async (settings: ProjectSettings) => {
            if (!project) return;

            const oldSettings = { ...project.settings };
            const newSettings = { ...project.settings, ...settings };
            setProject({ ...project, settings: newSettings });
            try {
                await getGitpodService().server.updateProjectPartial({ id: project.id, settings: newSettings });
                toast(`Project ${projectName} updated.`);
            } catch (error) {
                setProject({ ...project, settings: oldSettings });

                if (newSettings.prebuilds?.enable && error?.code === ErrorCodes.NOT_AUTHENTICATED) {
                    const { host, /*providerIsConnected, providerType,*/ repoName, requiredScopes } =
                        error?.data as PartialMessage<RepositoryUnauthorizedError>;

                    const toastId = `toast--host-authorized--${host}`;
                    toast(
                        <>
                            <p>There was a problem enabling prebuilds on "{repoName}"</p>
                            <p>Grant the {JSON.stringify(requiredScopes)} permissions and try again! 🙏🏻</p>
                            <div>
                                <LinkButton
                                    inverted
                                    onClick={() => authorizeWithProvider(host || "", requiredScopes || [], toastId)}
                                >
                                    Grant access
                                </LinkButton>
                            </div>
                        </>,
                        {
                            autoHide: false,
                            id: toastId,
                        },
                    );
                } else {
                    toast(error?.message || "Oh no, there was a problem with updating project settings.");
                }
            }
        },
        [project, setProject, toast, projectName, authorizeWithProvider],
    );

    const setPrebuildsEnabled = useCallback(
        async (value: boolean) => {
            if (!project) {
                return;
            }

            await updateProjectSettings({
                prebuilds: {
                    ...project.settings?.prebuilds,
                    enable: value,
                },
            });
        },
        [project, updateProjectSettings],
    );

    const setPrebuildBranchStrategy = useCallback(
        async (value: PrebuildSettings.BranchStrategy) => {
            if (!project) {
                return;
            }
            const oldValue = Project.getPrebuildSettings(project).branchStrategy;
            if (oldValue === value) {
                return;
            }
            const update: ProjectSettings = { ...project.settings };
            update.prebuilds = { ...update.prebuilds };
            update.prebuilds.branchStrategy = value;

            if (value === "matched-branches") {
                update.prebuilds.branchMatchingPattern = update.prebuilds.branchMatchingPattern || "**";
            }
            await updateProjectSettings(update);
        },
        [updateProjectSettings, project],
    );

    const debouncedUpdatePrebuildBranchPattern = useMemo(() => {
        return debounce(async (prebuildBranchPattern: string) => {
            if (!project) {
                return;
            }
            const update: ProjectSettings = { ...project.settings };
            update.prebuilds = { ...update.prebuilds };
            update.prebuilds.branchMatchingPattern = prebuildBranchPattern;

            await updateProjectSettings(update);
        }, 1500);
    }, [updateProjectSettings, project]);

    const updatePrebuildBranchPattern = useCallback(
        async (value: string) => {
            if (!value) {
                return;
            }
            setPrebuildBranchPattern(value);

            debouncedUpdatePrebuildBranchPattern(value);
        },
        [debouncedUpdatePrebuildBranchPattern],
    );

    const setWorkspaceClass = useCallback(
        async (value: string) => {
            if (!project) {
                return value;
            }
            const before = project.settings?.workspaceClasses?.regular;
            updateProjectSettings({ workspaceClasses: { ...project.settings?.workspaceClasses, regular: value } });
            return before;
        },
        [project, updateProjectSettings],
    );

    const setWorkspaceClassForPrebuild = useCallback(
        async (value: string) => {
            if (!project) {
                return;
            }
            const update: ProjectSettings = { ...project.settings };
            update.prebuilds = { ...update.prebuilds };
            update.prebuilds.workspaceClass = value;

            await updateProjectSettings(update);
        },
        [project, updateProjectSettings],
    );

    const setPrebuildInterval = useCallback(
        async (value: string) => {
            if (!project) {
                return;
            }
            const newInterval = Math.abs(Math.min(Number.parseInt(value), 100)) || 0;
            const update: ProjectSettings = { ...project.settings };
            update.prebuilds = { ...update.prebuilds };
            update.prebuilds.prebuildInterval = newInterval;

            await updateProjectSettings(update);
        },
        [project, updateProjectSettings],
    );

    const onProjectRemoved = useCallback(() => {
        history.push("/projects");
    }, [history]);

    // const { data: orgSettings } = useOrgSettingsQuery();
    const { data: projectSettings } = useProjectSettingsQuery(project?.id || "");

    // TODO: Render a generic error screen for when an entity isn't found
    if (!project) return null;

    const prebuildSettings = Project.getPrebuildSettings(project);

    interface WorkspaceClassOptionsProps {
        settings: ProjectSettings | undefined;
        disabled: boolean;
    }
    const WorkspaceClassOptions = (props: WorkspaceClassOptionsProps) => {
        const { project } = useCurrentProject();
        const [validateError, setValidateError] = useState("");
        const [selectedValue, setSelectedValue] = useState(props.settings?.restrictedWorkspaceClasses ?? []);
        const [isChanged, setIsChanged] = useState(false);
        const { data: classes, isError, isLoading } = useWorkspaceClasses();

        // TODO: Update restrictedWorkspaceClasses on the server using updateProjectPartial

        const { toast } = useToast();
        const handleUpdateProjectSettingsWorkspaceClasses = useCallback(
            async (classes: string[]) => {
                const newSettings = {
                    id: project?.id || "",
                    ...props.settings,
                    restrictedWorkspaceClasses: classes,
                };
                await getGitpodService().server.updateProjectPartial(newSettings);
                toast(`Available workspace classes updated.`);
            },
            [project?.id, props.settings, toast],
        );

        const noClassesSelected = useMemo(() => {
            return (props.settings?.restrictedWorkspaceClasses?.length ?? 0) === 0;
        }, [props.settings?.restrictedWorkspaceClasses]);

        if (isError || !classes) {
            return <div>Something went wrong</div>;
        }

        if (isLoading) {
            return <LoadingState />;
        }

        return (
            <div className="space-y-4">
                <div>
                    {classes.map((wsClass) => (
                        <SwitchInputField
                            className="mt-2"
                            key={wsClass.id}
                            id={wsClass.id}
                            label={wsClass.displayName}
                            description={wsClass.description}
                            checked={(!isChanged && noClassesSelected) || selectedValue.includes(wsClass.id)}
                            onCheckedChange={(checked) => {
                                const previousValue =
                                    !isChanged && noClassesSelected ? classes.map((e) => e.id) : selectedValue;
                                setIsChanged(true);
                                const newVal = (
                                    checked
                                        ? [...previousValue, wsClass.id]
                                        : previousValue.filter((e) => e !== wsClass.id)
                                ).filter((id) => classes.find((cls) => cls.id === id));
                                setValidateError(
                                    newVal.length === 0 ? "At least one workspace class has to be selected." : "",
                                );
                                setSelectedValue(newVal);
                            }}
                            disabled={props.disabled || isLoading}
                        />
                    ))}
                </div>

                <div className="flex gap-2 items-center">
                    {!props.disabled && (
                        <LoadingButton
                            disabled={props.disabled || !isChanged || validateError.length > 0}
                            loading={isLoading}
                            onClick={() => {
                                handleUpdateProjectSettingsWorkspaceClasses(selectedValue);
                            }}
                        >
                            Save
                        </LoadingButton>
                    )}
                    {validateError.length > 0 && (
                        <span className="text-red-600 dark:text-red-400">{validateError}</span>
                    )}
                    {/* {handleUpdateProjectSettingsWorkspaceClasses.isError && handleUpdateProjectSettingsWorkspaceClasses.error.message.length > 0 && (
                        <span className="text-red-600 dark:text-red-400">{handleUpdateProjectSettingsWorkspaceClasses.error.message}</span>
                    )} */}
                </div>
            </div>
        );
    };

    return (
        <ProjectSettingsPage project={project}>
            <Heading2>Project Name</Heading2>
            <form onSubmit={updateProjectName}>
                <TextInputField
                    hint={`The name can be up to ${MAX_PROJECT_NAME_LENGTH} characters long.`}
                    value={projectName}
                    error={badProjectName}
                    onChange={setProjectName}
                />

                <Button className="mt-4" type="submit" disabled={project?.name === projectName || !!badProjectName}>
                    Update Name
                </Button>
            </form>
            <div>
                <Heading2 className="mt-12">Prebuilds</Heading2>
                <CheckboxInputField
                    label="Enable prebuilds"
                    hint={
                        <span>
                            <Fragment>
                                Prebuilds reduce wait time for new workspaces.
                                {!prebuildSettings.enable
                                    ? " Enabling requires permissions to configure repository webhooks."
                                    : ""}
                            </Fragment>{" "}
                            <a
                                className="gp-link"
                                target="_blank"
                                rel="noreferrer"
                                href="https://www.gitpod.io/docs/configure/projects/prebuilds"
                            >
                                Learn more
                            </a>
                        </span>
                    }
                    checked={!!prebuildSettings.enable}
                    onChange={setPrebuildsEnabled}
                />
                {prebuildSettings.enable && (
                    <>
                        <div className="flex mt-4 max-w-2xl">
                            <div className="flex flex-col ml-6">
                                <label
                                    htmlFor="prebuildInterval"
                                    className={classNames(
                                        "text-sm font-semibold cursor-pointer tracking-wide",
                                        !prebuildSettings.enable
                                            ? "text-gray-400 dark:text-gray-400"
                                            : "text-gray-600 dark:text-gray-100",
                                    )}
                                >
                                    Commit Interval
                                </label>
                                <input
                                    type="number"
                                    id="prebuildInterval"
                                    min="0"
                                    max="100"
                                    step="5"
                                    className="mt-2"
                                    disabled={!prebuildSettings.enable}
                                    value={prebuildSettings.prebuildInterval}
                                    onChange={({ target }) => setPrebuildInterval(target.value)}
                                />
                                <div className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                                    The number of commits to be skipped between prebuild runs.
                                </div>
                            </div>
                        </div>
                        <div>
                            <SelectInputField
                                disabled={!prebuildSettings.enable}
                                label="Branch Filter"
                                value={prebuildSettings.branchStrategy || ""}
                                containerClassName="max-w-md ml-6 text-sm"
                                onChange={(val) => setPrebuildBranchStrategy(val as PrebuildSettings.BranchStrategy)}
                            >
                                <option value="all-branches">All branches</option>
                                <option value="default-branch">Default branch</option>
                                <option value="matched-branches">Match branches by pattern</option>
                            </SelectInputField>
                            <div className="ml-6 text-gray-500 dark:text-gray-400 text-sm mt-2">
                                Run prebuilds on the selected branches only.
                            </div>
                        </div>
                        {prebuildSettings.branchStrategy === "matched-branches" && (
                            <div className="flex flex-col ml-6 mt-4">
                                <label
                                    htmlFor="selectedBranches"
                                    className={classNames(
                                        "text-sm font-semibold cursor-pointer tracking-wide",
                                        !prebuildSettings.enable
                                            ? "text-gray-400 dark:text-gray-400"
                                            : "text-gray-600 dark:text-gray-100",
                                    )}
                                >
                                    Branch name pattern
                                </label>
                                <input
                                    type="text"
                                    id="selectedBranches"
                                    className="mt-2"
                                    disabled={prebuildSettings.branchStrategy !== "matched-branches"}
                                    value={prebuildBranchPattern}
                                    onChange={({ target }) => updatePrebuildBranchPattern(target.value)}
                                />
                                <div className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                                    Glob patterns separated by commas are supported.
                                </div>
                            </div>
                        )}
                        <InputField
                            className="max-w-md ml-6 text-sm"
                            label="Machine type"
                            disabled={!prebuildSettings.enable}
                        >
                            <SelectWorkspaceClassComponent
                                disabled={!prebuildSettings.enable}
                                selectedWorkspaceClass={prebuildSettings.workspaceClass}
                                onSelectionChange={setWorkspaceClassForPrebuild}
                            />
                            <div className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                                Use a smaller machine type for cost optimization.
                            </div>
                        </InputField>
                    </>
                )}
                <div>
                    <Heading2 className="mt-12">Workspaces</Heading2>
                    <Subheading>Choose the workspace machine type for your workspaces.</Subheading>
                    <div className="max-w-md mt-2">
                        <SelectWorkspaceClassComponent
                            selectedWorkspaceClass={project.settings?.workspaceClasses?.regular}
                            onSelectionChange={setWorkspaceClass}
                        />
                    </div>
                </div>
            </div>
            {/* TODO(sd): Add dashboard UX changes */}

            <div>
                <Heading2 className="mt-12">Available Workspace Classes</Heading2>
                <WorkspaceClassOptions disabled={!isOwner} settings={projectSettings as ProjectSettings} />
            </div>
            <div>
                <Heading2 className="mt-12">Remove Project</Heading2>
                <Subheading className="pb-4 max-w-md">
                    This will delete the project and all project-level environment variables you've set for this
                    project.
                </Subheading>
                <Button variant="destructive" onClick={() => setShowRemoveModal(true)}>
                    Remove Project
                </Button>
            </div>
            {showRemoveModal && (
                <RemoveProjectModal
                    project={project}
                    onRemoved={onProjectRemoved}
                    onClose={() => setShowRemoveModal(false)}
                />
            )}
        </ProjectSettingsPage>
    );
}
