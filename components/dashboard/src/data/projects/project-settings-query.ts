/**
 * Copyright (c) 2024 Gitpod GmbH. All rights reserved.
 * Licensed under the GNU Affero General Public License (AGPL).
 * See License.AGPL.txt in the project root for license information.
 */

import { useQuery } from "@tanstack/react-query";
import { configurationClient } from "../../service/public-api";
import { WorkspaceSettings } from "@gitpod/public-api/lib/gitpod/v1/configuration_pb";

export function useProjectSettingsQuery(projectId: string) {
    return useQuery<WorkspaceSettings, Error>(
        getQueryKey(projectId),
        async () => {
            if (!projectId) {
                throw new Error("No project selected.");
            }

            const settings = configurationClient.getConfiguration({ configurationId: projectId });
            return (await settings).configuration?.workspaceSettings || new WorkspaceSettings();
        },
        {
            enabled: !!projectId,
        },
    );
}

function getQueryKey(organizationId?: string) {
    return ["getOrganizationSettings", organizationId || "undefined"];
}
