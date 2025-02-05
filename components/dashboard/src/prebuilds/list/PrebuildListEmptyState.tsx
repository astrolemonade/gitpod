/**
 * Copyright (c) 2024 Gitpod GmbH. All rights reserved.
 * Licensed under the GNU Affero General Public License (AGPL).
 * See License.AGPL.txt in the project root for license information.
 */

import { FC } from "react";
import { Heading2, Subheading } from "@podkit/typography/Headings";
import { cn } from "@podkit/lib/cn";

export const PrebuildListEmptyState: FC = () => {
    return (
        <div className={cn("w-full flex justify-center mt-2 rounded-xl bg-gray-100 dark:bg-gray-800 px-4 py-20")}>
            <div className="flex flex-col justify-center items-center text-center space-y-4">
                <Heading2>No prebuilds yet</Heading2>
                <Subheading className="max-w-md">
                    Go on, import some repositories and turn prebuilds on. We'll be patiently waiting.
                </Subheading>
            </div>
        </div>
    );
};
