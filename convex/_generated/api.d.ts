/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as omatEditor from "../omatEditor.js";
import type * as omatPublic from "../omatPublic.js";
import type * as omatShared from "../omatShared.js";
import type * as omats from "../omats.js";
import type * as parties from "../parties.js";
import type * as positions from "../positions.js";
import type * as questionnaires from "../questionnaires.js";
import type * as questions from "../questions.js";
import type * as uploads from "../uploads.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  omatEditor: typeof omatEditor;
  omatPublic: typeof omatPublic;
  omatShared: typeof omatShared;
  omats: typeof omats;
  parties: typeof parties;
  positions: typeof positions;
  questionnaires: typeof questionnaires;
  questions: typeof questions;
  uploads: typeof uploads;
  workspaces: typeof workspaces;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
