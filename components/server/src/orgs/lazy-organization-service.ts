/**
 * Copyright (c) 2024 Gitpod GmbH. All rights reserved.
 * Licensed under the GNU Affero General Public License (AGPL).
 * See License.AGPL.txt in the project root for license information.
 */

import { OrganizationSettings } from "@gitpod/gitpod-protocol";

export interface LazyOrganizationService {
    getSettings(userId: string, orgId: string): Promise<OrganizationSettings>;
}

export const LazyOrganizationService = Symbol("LazyOrganizationService");
