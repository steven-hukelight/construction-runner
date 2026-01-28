"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/admin/firestore-counts/route";
exports.ids = ["app/api/admin/firestore-counts/route"];
exports.modules = {

/***/ "firebase-admin":
/*!*********************************!*\
  !*** external "firebase-admin" ***!
  \*********************************/
/***/ ((module) => {

module.exports = require("firebase-admin");

/***/ }),

/***/ "./action-async-storage.external":
/*!*******************************************************************************!*\
  !*** external "next/dist/client/components/action-async-storage.external.js" ***!
  \*******************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/action-async-storage.external.js");

/***/ }),

/***/ "./request-async-storage.external":
/*!********************************************************************************!*\
  !*** external "next/dist/client/components/request-async-storage.external.js" ***!
  \********************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/request-async-storage.external.js");

/***/ }),

/***/ "./static-generation-async-storage.external":
/*!******************************************************************************************!*\
  !*** external "next/dist/client/components/static-generation-async-storage.external.js" ***!
  \******************************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/static-generation-async-storage.external.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "assert":
/*!*************************!*\
  !*** external "assert" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("assert");

/***/ }),

/***/ "buffer":
/*!*************************!*\
  !*** external "buffer" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("buffer");

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("crypto");

/***/ }),

/***/ "events":
/*!*************************!*\
  !*** external "events" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("events");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

module.exports = require("fs");

/***/ }),

/***/ "http":
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("http");

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

module.exports = require("https");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("path");

/***/ }),

/***/ "querystring":
/*!******************************!*\
  !*** external "querystring" ***!
  \******************************/
/***/ ((module) => {

module.exports = require("querystring");

/***/ }),

/***/ "url":
/*!**********************!*\
  !*** external "url" ***!
  \**********************/
/***/ ((module) => {

module.exports = require("url");

/***/ }),

/***/ "util":
/*!***********************!*\
  !*** external "util" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("util");

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("zlib");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fadmin%2Ffirestore-counts%2Froute&page=%2Fapi%2Fadmin%2Ffirestore-counts%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fadmin%2Ffirestore-counts%2Froute.ts&appDir=%2FUsers%2Fsteven_hukelight%2Fsitehub-admin%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fsteven_hukelight%2Fsitehub-admin&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!******************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fadmin%2Ffirestore-counts%2Froute&page=%2Fapi%2Fadmin%2Ffirestore-counts%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fadmin%2Ffirestore-counts%2Froute.ts&appDir=%2FUsers%2Fsteven_hukelight%2Fsitehub-admin%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fsteven_hukelight%2Fsitehub-admin&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \******************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   originalPathname: () => (/* binding */ originalPathname),\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   requestAsyncStorage: () => (/* binding */ requestAsyncStorage),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   staticGenerationAsyncStorage: () => (/* binding */ staticGenerationAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/future/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/future/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/future/route-kind */ \"(rsc)/./node_modules/next/dist/server/future/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_steven_hukelight_sitehub_admin_app_api_admin_firestore_counts_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/admin/firestore-counts/route.ts */ \"(rsc)/./app/api/admin/firestore-counts/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/admin/firestore-counts/route\",\n        pathname: \"/api/admin/firestore-counts\",\n        filename: \"route\",\n        bundlePath: \"app/api/admin/firestore-counts/route\"\n    },\n    resolvedPagePath: \"/Users/steven_hukelight/sitehub-admin/app/api/admin/firestore-counts/route.ts\",\n    nextConfigOutput,\n    userland: _Users_steven_hukelight_sitehub_admin_app_api_admin_firestore_counts_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { requestAsyncStorage, staticGenerationAsyncStorage, serverHooks } = routeModule;\nconst originalPathname = \"/api/admin/firestore-counts/route\";\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        serverHooks,\n        staticGenerationAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIuanM/bmFtZT1hcHAlMkZhcGklMkZhZG1pbiUyRmZpcmVzdG9yZS1jb3VudHMlMkZyb3V0ZSZwYWdlPSUyRmFwaSUyRmFkbWluJTJGZmlyZXN0b3JlLWNvdW50cyUyRnJvdXRlJmFwcFBhdGhzPSZwYWdlUGF0aD1wcml2YXRlLW5leHQtYXBwLWRpciUyRmFwaSUyRmFkbWluJTJGZmlyZXN0b3JlLWNvdW50cyUyRnJvdXRlLnRzJmFwcERpcj0lMkZVc2VycyUyRnN0ZXZlbl9odWtlbGlnaHQlMkZzaXRlaHViLWFkbWluJTJGYXBwJnBhZ2VFeHRlbnNpb25zPXRzeCZwYWdlRXh0ZW5zaW9ucz10cyZwYWdlRXh0ZW5zaW9ucz1qc3gmcGFnZUV4dGVuc2lvbnM9anMmcm9vdERpcj0lMkZVc2VycyUyRnN0ZXZlbl9odWtlbGlnaHQlMkZzaXRlaHViLWFkbWluJmlzRGV2PXRydWUmdHNjb25maWdQYXRoPXRzY29uZmlnLmpzb24mYmFzZVBhdGg9JmFzc2V0UHJlZml4PSZuZXh0Q29uZmlnT3V0cHV0PSZwcmVmZXJyZWRSZWdpb249Jm1pZGRsZXdhcmVDb25maWc9ZTMwJTNEISIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBc0c7QUFDdkM7QUFDYztBQUM2QjtBQUMxRztBQUNBO0FBQ0E7QUFDQSx3QkFBd0IsZ0hBQW1CO0FBQzNDO0FBQ0EsY0FBYyx5RUFBUztBQUN2QjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0EsWUFBWTtBQUNaLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQSxRQUFRLGlFQUFpRTtBQUN6RTtBQUNBO0FBQ0EsV0FBVyw0RUFBVztBQUN0QjtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ3VIOztBQUV2SCIsInNvdXJjZXMiOlsid2VicGFjazovL3NpdGVodWItYWRtaW4vPzZmNjUiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwUm91dGVSb3V0ZU1vZHVsZSB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2Z1dHVyZS9yb3V0ZS1tb2R1bGVzL2FwcC1yb3V0ZS9tb2R1bGUuY29tcGlsZWRcIjtcbmltcG9ydCB7IFJvdXRlS2luZCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2Z1dHVyZS9yb3V0ZS1raW5kXCI7XG5pbXBvcnQgeyBwYXRjaEZldGNoIGFzIF9wYXRjaEZldGNoIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvbGliL3BhdGNoLWZldGNoXCI7XG5pbXBvcnQgKiBhcyB1c2VybGFuZCBmcm9tIFwiL1VzZXJzL3N0ZXZlbl9odWtlbGlnaHQvc2l0ZWh1Yi1hZG1pbi9hcHAvYXBpL2FkbWluL2ZpcmVzdG9yZS1jb3VudHMvcm91dGUudHNcIjtcbi8vIFdlIGluamVjdCB0aGUgbmV4dENvbmZpZ091dHB1dCBoZXJlIHNvIHRoYXQgd2UgY2FuIHVzZSB0aGVtIGluIHRoZSByb3V0ZVxuLy8gbW9kdWxlLlxuY29uc3QgbmV4dENvbmZpZ091dHB1dCA9IFwiXCJcbmNvbnN0IHJvdXRlTW9kdWxlID0gbmV3IEFwcFJvdXRlUm91dGVNb2R1bGUoe1xuICAgIGRlZmluaXRpb246IHtcbiAgICAgICAga2luZDogUm91dGVLaW5kLkFQUF9ST1VURSxcbiAgICAgICAgcGFnZTogXCIvYXBpL2FkbWluL2ZpcmVzdG9yZS1jb3VudHMvcm91dGVcIixcbiAgICAgICAgcGF0aG5hbWU6IFwiL2FwaS9hZG1pbi9maXJlc3RvcmUtY291bnRzXCIsXG4gICAgICAgIGZpbGVuYW1lOiBcInJvdXRlXCIsXG4gICAgICAgIGJ1bmRsZVBhdGg6IFwiYXBwL2FwaS9hZG1pbi9maXJlc3RvcmUtY291bnRzL3JvdXRlXCJcbiAgICB9LFxuICAgIHJlc29sdmVkUGFnZVBhdGg6IFwiL1VzZXJzL3N0ZXZlbl9odWtlbGlnaHQvc2l0ZWh1Yi1hZG1pbi9hcHAvYXBpL2FkbWluL2ZpcmVzdG9yZS1jb3VudHMvcm91dGUudHNcIixcbiAgICBuZXh0Q29uZmlnT3V0cHV0LFxuICAgIHVzZXJsYW5kXG59KTtcbi8vIFB1bGwgb3V0IHRoZSBleHBvcnRzIHRoYXQgd2UgbmVlZCB0byBleHBvc2UgZnJvbSB0aGUgbW9kdWxlLiBUaGlzIHNob3VsZFxuLy8gYmUgZWxpbWluYXRlZCB3aGVuIHdlJ3ZlIG1vdmVkIHRoZSBvdGhlciByb3V0ZXMgdG8gdGhlIG5ldyBmb3JtYXQuIFRoZXNlXG4vLyBhcmUgdXNlZCB0byBob29rIGludG8gdGhlIHJvdXRlLlxuY29uc3QgeyByZXF1ZXN0QXN5bmNTdG9yYWdlLCBzdGF0aWNHZW5lcmF0aW9uQXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcyB9ID0gcm91dGVNb2R1bGU7XG5jb25zdCBvcmlnaW5hbFBhdGhuYW1lID0gXCIvYXBpL2FkbWluL2ZpcmVzdG9yZS1jb3VudHMvcm91dGVcIjtcbmZ1bmN0aW9uIHBhdGNoRmV0Y2goKSB7XG4gICAgcmV0dXJuIF9wYXRjaEZldGNoKHtcbiAgICAgICAgc2VydmVySG9va3MsXG4gICAgICAgIHN0YXRpY0dlbmVyYXRpb25Bc3luY1N0b3JhZ2VcbiAgICB9KTtcbn1cbmV4cG9ydCB7IHJvdXRlTW9kdWxlLCByZXF1ZXN0QXN5bmNTdG9yYWdlLCBzdGF0aWNHZW5lcmF0aW9uQXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcywgb3JpZ2luYWxQYXRobmFtZSwgcGF0Y2hGZXRjaCwgIH07XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWFwcC1yb3V0ZS5qcy5tYXAiXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fadmin%2Ffirestore-counts%2Froute&page=%2Fapi%2Fadmin%2Ffirestore-counts%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fadmin%2Ffirestore-counts%2Froute.ts&appDir=%2FUsers%2Fsteven_hukelight%2Fsitehub-admin%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fsteven_hukelight%2Fsitehub-admin&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./app/api/admin/firestore-counts/route.ts":
/*!*************************************************!*\
  !*** ./app/api/admin/firestore-counts/route.ts ***!
  \*************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   GET: () => (/* binding */ GET)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n/* harmony import */ var _lib_firebaseAdmin__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/lib/firebaseAdmin */ \"(rsc)/./lib/firebaseAdmin.ts\");\n/* harmony import */ var next_auth__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next-auth */ \"(rsc)/./node_modules/next-auth/index.js\");\n/* harmony import */ var next_auth__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_auth__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _lib_auth__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @/lib/auth */ \"(rsc)/./lib/auth.ts\");\n\n\n\n\nasync function GET(request) {\n    try {\n        const session = await (0,next_auth__WEBPACK_IMPORTED_MODULE_2__.getServerSession)(_lib_auth__WEBPACK_IMPORTED_MODULE_3__.authOptions);\n        let allowed = Boolean(session && session.user && session.user.role === \"admin\");\n        if (!allowed && \"development\" !== \"production\") {\n            const cookieHeader = request.headers && request.headers?.get ? request.headers.get(\"cookie\") : null;\n            if (cookieHeader && /role=admin/i.test(cookieHeader)) allowed = true;\n        }\n        if (!allowed) {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                ok: false,\n                error: \"unauthorized\"\n            }, {\n                status: 401\n            });\n        }\n        const url = new URL(request.url);\n        const q = url.searchParams.get(\"collections\");\n        const collections = q ? q.split(\",\").map((s)=>s.trim()).filter(Boolean) : [\n            \"sites\",\n            \"users\",\n            \"rams\"\n        ];\n        const counts = {};\n        for (const name of collections){\n            try {\n                const snap = await _lib_firebaseAdmin__WEBPACK_IMPORTED_MODULE_1__.db.collection(name).get();\n                counts[name] = snap.size || snap.docs.length || 0;\n            } catch (e) {\n                counts[name] = 0;\n            }\n        }\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            ok: true,\n            counts\n        });\n    } catch (err) {\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            ok: false,\n            error: String(err?.message ?? err)\n        }, {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXBpL2FkbWluL2ZpcmVzdG9yZS1jb3VudHMvcm91dGUudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQTJDO0FBQ0Y7QUFDSTtBQUNKO0FBRWxDLGVBQWVJLElBQUlDLE9BQWdCO0lBQ3hDLElBQUk7UUFDRixNQUFNQyxVQUFVLE1BQU1KLDJEQUFnQkEsQ0FBQ0Msa0RBQVdBO1FBQ2xELElBQUlJLFVBQVVDLFFBQVFGLFdBQVdBLFFBQVFHLElBQUksSUFBSUgsUUFBUUcsSUFBSSxDQUFDQyxJQUFJLEtBQUs7UUFDdkUsSUFBSSxDQUFDSCxXQUFXSSxrQkFBeUIsY0FBYztZQUNyRCxNQUFNQyxlQUFlLFFBQVNDLE9BQU8sSUFBSSxRQUFpQkEsT0FBTyxFQUFFQyxNQUMvRCxRQUFpQkQsT0FBTyxDQUFDQyxHQUFHLENBQUMsWUFDN0I7WUFDSixJQUFJRixnQkFBZ0IsY0FBY0csSUFBSSxDQUFDSCxlQUFlTCxVQUFVO1FBQ2xFO1FBRUEsSUFBSSxDQUFDQSxTQUFTO1lBQ1osT0FBT1AscURBQVlBLENBQUNnQixJQUFJLENBQUM7Z0JBQUVDLElBQUk7Z0JBQU9DLE9BQU87WUFBZSxHQUFHO2dCQUFFQyxRQUFRO1lBQUk7UUFDL0U7UUFFQSxNQUFNQyxNQUFNLElBQUlDLElBQUloQixRQUFRZSxHQUFHO1FBQy9CLE1BQU1FLElBQUlGLElBQUlHLFlBQVksQ0FBQ1QsR0FBRyxDQUFDO1FBQy9CLE1BQU1VLGNBQWNGLElBQUlBLEVBQUVHLEtBQUssQ0FBQyxLQUFLQyxHQUFHLENBQUMsQ0FBQ0MsSUFBTUEsRUFBRUMsSUFBSSxJQUFJQyxNQUFNLENBQUNyQixXQUFXO1lBQUM7WUFBUztZQUFTO1NBQU87UUFFdEcsTUFBTXNCLFNBQWlDLENBQUM7UUFDeEMsS0FBSyxNQUFNQyxRQUFRUCxZQUFhO1lBQzlCLElBQUk7Z0JBQ0YsTUFBTVEsT0FBTyxNQUFNL0Isa0RBQUVBLENBQUNnQyxVQUFVLENBQUNGLE1BQU1qQixHQUFHO2dCQUMxQ2dCLE1BQU0sQ0FBQ0MsS0FBSyxHQUFHQyxLQUFLRSxJQUFJLElBQUlGLEtBQUtHLElBQUksQ0FBQ0MsTUFBTSxJQUFJO1lBQ2xELEVBQUUsT0FBT0MsR0FBRztnQkFDVlAsTUFBTSxDQUFDQyxLQUFLLEdBQUc7WUFDakI7UUFDRjtRQUVBLE9BQU8vQixxREFBWUEsQ0FBQ2dCLElBQUksQ0FBQztZQUFFQyxJQUFJO1lBQU1hO1FBQU87SUFDOUMsRUFBRSxPQUFPUSxLQUFVO1FBQ2pCLE9BQU90QyxxREFBWUEsQ0FBQ2dCLElBQUksQ0FBQztZQUFFQyxJQUFJO1lBQU9DLE9BQU9xQixPQUFPRCxLQUFLRSxXQUFXRjtRQUFLLEdBQUc7WUFBRW5CLFFBQVE7UUFBSTtJQUM1RjtBQUNGIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vc2l0ZWh1Yi1hZG1pbi8uL2FwcC9hcGkvYWRtaW4vZmlyZXN0b3JlLWNvdW50cy9yb3V0ZS50cz81Yjk5Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE5leHRSZXNwb25zZSB9IGZyb20gXCJuZXh0L3NlcnZlclwiO1xuaW1wb3J0IHsgZGIgfSBmcm9tIFwiQC9saWIvZmlyZWJhc2VBZG1pblwiO1xuaW1wb3J0IHsgZ2V0U2VydmVyU2Vzc2lvbiB9IGZyb20gXCJuZXh0LWF1dGhcIjtcbmltcG9ydCB7IGF1dGhPcHRpb25zIH0gZnJvbSBcIkAvbGliL2F1dGhcIjtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIEdFVChyZXF1ZXN0OiBSZXF1ZXN0KSB7XG4gIHRyeSB7XG4gICAgY29uc3Qgc2Vzc2lvbiA9IGF3YWl0IGdldFNlcnZlclNlc3Npb24oYXV0aE9wdGlvbnMgYXMgYW55KTtcbiAgICBsZXQgYWxsb3dlZCA9IEJvb2xlYW4oc2Vzc2lvbiAmJiBzZXNzaW9uLnVzZXIgJiYgc2Vzc2lvbi51c2VyLnJvbGUgPT09IFwiYWRtaW5cIik7XG4gICAgaWYgKCFhbGxvd2VkICYmIHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSBcInByb2R1Y3Rpb25cIikge1xuICAgICAgY29uc3QgY29va2llSGVhZGVyID0gKHJlcXVlc3QuaGVhZGVycyAmJiAocmVxdWVzdCBhcyBhbnkpLmhlYWRlcnM/LmdldClcbiAgICAgICAgPyAocmVxdWVzdCBhcyBhbnkpLmhlYWRlcnMuZ2V0KFwiY29va2llXCIpXG4gICAgICAgIDogbnVsbDtcbiAgICAgIGlmIChjb29raWVIZWFkZXIgJiYgL3JvbGU9YWRtaW4vaS50ZXN0KGNvb2tpZUhlYWRlcikpIGFsbG93ZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmICghYWxsb3dlZCkge1xuICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHsgb2s6IGZhbHNlLCBlcnJvcjogXCJ1bmF1dGhvcml6ZWRcIiB9LCB7IHN0YXR1czogNDAxIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IHVybCA9IG5ldyBVUkwocmVxdWVzdC51cmwpO1xuICAgIGNvbnN0IHEgPSB1cmwuc2VhcmNoUGFyYW1zLmdldChcImNvbGxlY3Rpb25zXCIpO1xuICAgIGNvbnN0IGNvbGxlY3Rpb25zID0gcSA/IHEuc3BsaXQoXCIsXCIpLm1hcCgocykgPT4gcy50cmltKCkpLmZpbHRlcihCb29sZWFuKSA6IFtcInNpdGVzXCIsIFwidXNlcnNcIiwgXCJyYW1zXCJdO1xuXG4gICAgY29uc3QgY291bnRzOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+ID0ge307XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIGNvbGxlY3Rpb25zKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBzbmFwID0gYXdhaXQgZGIuY29sbGVjdGlvbihuYW1lKS5nZXQoKTtcbiAgICAgICAgY291bnRzW25hbWVdID0gc25hcC5zaXplIHx8IHNuYXAuZG9jcy5sZW5ndGggfHwgMDtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY291bnRzW25hbWVdID0gMDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBvazogdHJ1ZSwgY291bnRzIH0pO1xuICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IG9rOiBmYWxzZSwgZXJyb3I6IFN0cmluZyhlcnI/Lm1lc3NhZ2UgPz8gZXJyKSB9LCB7IHN0YXR1czogNTAwIH0pO1xuICB9XG59XG4iXSwibmFtZXMiOlsiTmV4dFJlc3BvbnNlIiwiZGIiLCJnZXRTZXJ2ZXJTZXNzaW9uIiwiYXV0aE9wdGlvbnMiLCJHRVQiLCJyZXF1ZXN0Iiwic2Vzc2lvbiIsImFsbG93ZWQiLCJCb29sZWFuIiwidXNlciIsInJvbGUiLCJwcm9jZXNzIiwiY29va2llSGVhZGVyIiwiaGVhZGVycyIsImdldCIsInRlc3QiLCJqc29uIiwib2siLCJlcnJvciIsInN0YXR1cyIsInVybCIsIlVSTCIsInEiLCJzZWFyY2hQYXJhbXMiLCJjb2xsZWN0aW9ucyIsInNwbGl0IiwibWFwIiwicyIsInRyaW0iLCJmaWx0ZXIiLCJjb3VudHMiLCJuYW1lIiwic25hcCIsImNvbGxlY3Rpb24iLCJzaXplIiwiZG9jcyIsImxlbmd0aCIsImUiLCJlcnIiLCJTdHJpbmciLCJtZXNzYWdlIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./app/api/admin/firestore-counts/route.ts\n");

/***/ }),

/***/ "(rsc)/./lib/auth.ts":
/*!*********************!*\
  !*** ./lib/auth.ts ***!
  \*********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   authOptions: () => (/* binding */ authOptions),\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony import */ var next_auth_providers_credentials__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next-auth/providers/credentials */ \"(rsc)/./node_modules/next-auth/providers/credentials.js\");\n\nconst authOptions = {\n    secret: process.env.NEXTAUTH_SECRET,\n    pages: {\n        signIn: \"/login\"\n    },\n    providers: [\n        (0,next_auth_providers_credentials__WEBPACK_IMPORTED_MODULE_0__[\"default\"])({\n            id: \"credentials\",\n            name: \"Credentials\",\n            credentials: {\n                email: {\n                    label: \"Email\",\n                    type: \"email\"\n                },\n                password: {\n                    label: \"Password\",\n                    type: \"password\"\n                }\n            },\n            async authorize (credentials) {\n                if (!credentials?.email || !credentials.password) return null;\n                if (credentials.email === \"admin@sitehub.local\" && credentials.password === \"password123\") {\n                    return {\n                        id: \"1\",\n                        name: \"Steven\",\n                        email: \"admin@sitehub.local\",\n                        role: \"admin\"\n                    };\n                }\n                return null;\n            }\n        })\n    ],\n    callbacks: {\n        async jwt ({ token, user }) {\n            if (user) token.role = user.role;\n            return token;\n        },\n        async session ({ session, token }) {\n            if (session.user) session.user.role = token.role;\n            return session;\n        }\n    }\n};\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (authOptions);\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9saWIvYXV0aC50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7QUFDMEQ7QUFFbkQsTUFBTUMsY0FBYztJQUN6QkMsUUFBUUMsUUFBUUMsR0FBRyxDQUFDQyxlQUFlO0lBQ25DQyxPQUFPO1FBQ0xDLFFBQVE7SUFDVjtJQUNBQyxXQUFXO1FBQ1RSLDJFQUFXQSxDQUFDO1lBQ1ZTLElBQUk7WUFDSkMsTUFBTTtZQUNOQyxhQUFhO2dCQUNYQyxPQUFPO29CQUFFQyxPQUFPO29CQUFTQyxNQUFNO2dCQUFRO2dCQUN2Q0MsVUFBVTtvQkFBRUYsT0FBTztvQkFBWUMsTUFBTTtnQkFBVztZQUNsRDtZQUNBLE1BQU1FLFdBQVVMLFdBQVc7Z0JBQ3pCLElBQUksQ0FBQ0EsYUFBYUMsU0FBUyxDQUFDRCxZQUFZSSxRQUFRLEVBQUUsT0FBTztnQkFFekQsSUFDRUosWUFBWUMsS0FBSyxLQUFLLHlCQUN0QkQsWUFBWUksUUFBUSxLQUFLLGVBQ3pCO29CQUNBLE9BQU87d0JBQ0xOLElBQUk7d0JBQ0pDLE1BQU07d0JBQ05FLE9BQU87d0JBQ1BLLE1BQU07b0JBQ1I7Z0JBQ0Y7Z0JBRUEsT0FBTztZQUNUO1FBQ0Y7S0FDRDtJQUNEQyxXQUFXO1FBQ1QsTUFBTUMsS0FBSSxFQUFFQyxLQUFLLEVBQUVDLElBQUksRUFBOEI7WUFDbkQsSUFBSUEsTUFBTUQsTUFBTUgsSUFBSSxHQUFHSSxLQUFLSixJQUFJO1lBQ2hDLE9BQU9HO1FBQ1Q7UUFDQSxNQUFNRSxTQUFRLEVBQUVBLE9BQU8sRUFBRUYsS0FBSyxFQUFnQztZQUM1RCxJQUFJRSxRQUFRRCxJQUFJLEVBQUVDLFFBQVFELElBQUksQ0FBQ0osSUFBSSxHQUFHRyxNQUFNSCxJQUFJO1lBQ2hELE9BQU9LO1FBQ1Q7SUFDRjtBQUNGLEVBQUU7QUFFRixpRUFBZXJCLFdBQVdBLEVBQUMiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9zaXRlaHViLWFkbWluLy4vbGliL2F1dGgudHM/YmY3ZSJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgTmV4dEF1dGggZnJvbSBcIm5leHQtYXV0aFwiO1xuaW1wb3J0IENyZWRlbnRpYWxzIGZyb20gXCJuZXh0LWF1dGgvcHJvdmlkZXJzL2NyZWRlbnRpYWxzXCI7XG5cbmV4cG9ydCBjb25zdCBhdXRoT3B0aW9ucyA9IHtcbiAgc2VjcmV0OiBwcm9jZXNzLmVudi5ORVhUQVVUSF9TRUNSRVQsXG4gIHBhZ2VzOiB7XG4gICAgc2lnbkluOiBcIi9sb2dpblwiLFxuICB9LFxuICBwcm92aWRlcnM6IFtcbiAgICBDcmVkZW50aWFscyh7XG4gICAgICBpZDogXCJjcmVkZW50aWFsc1wiLFxuICAgICAgbmFtZTogXCJDcmVkZW50aWFsc1wiLFxuICAgICAgY3JlZGVudGlhbHM6IHtcbiAgICAgICAgZW1haWw6IHsgbGFiZWw6IFwiRW1haWxcIiwgdHlwZTogXCJlbWFpbFwiIH0sXG4gICAgICAgIHBhc3N3b3JkOiB7IGxhYmVsOiBcIlBhc3N3b3JkXCIsIHR5cGU6IFwicGFzc3dvcmRcIiB9LFxuICAgICAgfSxcbiAgICAgIGFzeW5jIGF1dGhvcml6ZShjcmVkZW50aWFscykge1xuICAgICAgICBpZiAoIWNyZWRlbnRpYWxzPy5lbWFpbCB8fCAhY3JlZGVudGlhbHMucGFzc3dvcmQpIHJldHVybiBudWxsO1xuXG4gICAgICAgIGlmIChcbiAgICAgICAgICBjcmVkZW50aWFscy5lbWFpbCA9PT0gXCJhZG1pbkBzaXRlaHViLmxvY2FsXCIgJiZcbiAgICAgICAgICBjcmVkZW50aWFscy5wYXNzd29yZCA9PT0gXCJwYXNzd29yZDEyM1wiXG4gICAgICAgICkge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBpZDogXCIxXCIsXG4gICAgICAgICAgICBuYW1lOiBcIlN0ZXZlblwiLFxuICAgICAgICAgICAgZW1haWw6IFwiYWRtaW5Ac2l0ZWh1Yi5sb2NhbFwiLFxuICAgICAgICAgICAgcm9sZTogXCJhZG1pblwiLFxuICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH0sXG4gICAgfSksXG4gIF0sXG4gIGNhbGxiYWNrczoge1xuICAgIGFzeW5jIGp3dCh7IHRva2VuLCB1c2VyIH06IHsgdG9rZW46IGFueTsgdXNlcj86IGFueSB9KSB7XG4gICAgICBpZiAodXNlcikgdG9rZW4ucm9sZSA9IHVzZXIucm9sZTtcbiAgICAgIHJldHVybiB0b2tlbjtcbiAgICB9LFxuICAgIGFzeW5jIHNlc3Npb24oeyBzZXNzaW9uLCB0b2tlbiB9OiB7IHNlc3Npb246IGFueTsgdG9rZW46IGFueSB9KSB7XG4gICAgICBpZiAoc2Vzc2lvbi51c2VyKSBzZXNzaW9uLnVzZXIucm9sZSA9IHRva2VuLnJvbGU7XG4gICAgICByZXR1cm4gc2Vzc2lvbjtcbiAgICB9LFxuICB9LFxufTtcblxuZXhwb3J0IGRlZmF1bHQgYXV0aE9wdGlvbnM7XG4iXSwibmFtZXMiOlsiQ3JlZGVudGlhbHMiLCJhdXRoT3B0aW9ucyIsInNlY3JldCIsInByb2Nlc3MiLCJlbnYiLCJORVhUQVVUSF9TRUNSRVQiLCJwYWdlcyIsInNpZ25JbiIsInByb3ZpZGVycyIsImlkIiwibmFtZSIsImNyZWRlbnRpYWxzIiwiZW1haWwiLCJsYWJlbCIsInR5cGUiLCJwYXNzd29yZCIsImF1dGhvcml6ZSIsInJvbGUiLCJjYWxsYmFja3MiLCJqd3QiLCJ0b2tlbiIsInVzZXIiLCJzZXNzaW9uIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./lib/auth.ts\n");

/***/ }),

/***/ "(rsc)/./lib/firebaseAdmin.ts":
/*!******************************!*\
  !*** ./lib/firebaseAdmin.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   bucket: () => (/* binding */ bucket),\n/* harmony export */   db: () => (/* binding */ db)\n/* harmony export */ });\n/* harmony import */ var firebase_admin__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! firebase-admin */ \"firebase-admin\");\n/* harmony import */ var firebase_admin__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(firebase_admin__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! fs */ \"fs\");\n/* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(fs__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! path */ \"path\");\n/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(path__WEBPACK_IMPORTED_MODULE_2__);\n\n\n\n\nfunction loadServiceAccount() {\n    try {\n        const p = path__WEBPACK_IMPORTED_MODULE_2___default().resolve(process.cwd(), \"firebase-service-account.json\");\n        if ((0,fs__WEBPACK_IMPORTED_MODULE_1__.existsSync)(p)) {\n            const raw = (0,fs__WEBPACK_IMPORTED_MODULE_1__.readFileSync)(p, \"utf8\");\n            return JSON.parse(raw);\n        }\n    } catch (e) {\n    // ignore and fallback to env\n    }\n    return null;\n}\nif (!firebase_admin__WEBPACK_IMPORTED_MODULE_0__.apps.length) {\n    const serviceAccount = loadServiceAccount();\n    if (serviceAccount) {\n        firebase_admin__WEBPACK_IMPORTED_MODULE_0__.initializeApp({\n            credential: firebase_admin__WEBPACK_IMPORTED_MODULE_0__.credential.cert(serviceAccount),\n            storageBucket: process.env.FIREBASE_STORAGE_BUCKET || serviceAccount.project_id + \".appspot.com\"\n        });\n    } else {\n        firebase_admin__WEBPACK_IMPORTED_MODULE_0__.initializeApp({\n            credential: firebase_admin__WEBPACK_IMPORTED_MODULE_0__.credential.cert({\n                projectId: process.env.FIREBASE_PROJECT_ID,\n                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,\n                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\\\n/g, \"\\n\")\n            }),\n            storageBucket: process.env.FIREBASE_STORAGE_BUCKET\n        });\n    }\n}\nconst db = firebase_admin__WEBPACK_IMPORTED_MODULE_0__.firestore();\nconst bucket = firebase_admin__WEBPACK_IMPORTED_MODULE_0__.storage().bucket();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9saWIvZmlyZWJhc2VBZG1pbi50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUF3QztBQUNSO0FBQ0U7QUFDVjtBQUV4QixTQUFTSTtJQUNQLElBQUk7UUFDRixNQUFNQyxJQUFJRixtREFBWSxDQUFDSSxRQUFRQyxHQUFHLElBQUk7UUFDdEMsSUFBSVAsOENBQVVBLENBQUNJLElBQUk7WUFDakIsTUFBTUksTUFBTVAsZ0RBQVlBLENBQUNHLEdBQUc7WUFDNUIsT0FBT0ssS0FBS0MsS0FBSyxDQUFDRjtRQUNwQjtJQUNGLEVBQUUsT0FBT0csR0FBRztJQUNWLDZCQUE2QjtJQUMvQjtJQUNBLE9BQU87QUFDVDtBQUVBLElBQUksQ0FBQ1osZ0RBQVUsQ0FBQ2MsTUFBTSxFQUFFO0lBQ3RCLE1BQU1DLGlCQUFpQlg7SUFFdkIsSUFBSVcsZ0JBQWdCO1FBQ2xCZix5REFBbUIsQ0FBQztZQUNsQmlCLFlBQVlqQixzREFBZ0IsQ0FBQ2tCLElBQUksQ0FBQ0g7WUFDbENJLGVBQWVaLFFBQVFhLEdBQUcsQ0FBQ0MsdUJBQXVCLElBQUlOLGVBQWVPLFVBQVUsR0FBRztRQUNwRjtJQUNGLE9BQU87UUFDTHRCLHlEQUFtQixDQUFDO1lBQ2xCaUIsWUFBWWpCLHNEQUFnQixDQUFDa0IsSUFBSSxDQUFDO2dCQUNoQ0ssV0FBV2hCLFFBQVFhLEdBQUcsQ0FBQ0ksbUJBQW1CO2dCQUMxQ0MsYUFBYWxCLFFBQVFhLEdBQUcsQ0FBQ00scUJBQXFCO2dCQUM5Q0MsWUFBWXBCLFFBQVFhLEdBQUcsQ0FBQ1Esb0JBQW9CLEVBQUVDLFFBQVEsUUFBUTtZQUNoRTtZQUNBVixlQUFlWixRQUFRYSxHQUFHLENBQUNDLHVCQUF1QjtRQUNwRDtJQUNGO0FBQ0Y7QUFFTyxNQUFNUyxLQUFLOUIscURBQWUsR0FBRztBQUM3QixNQUFNZ0MsU0FBU2hDLG1EQUFhLEdBQUdnQyxNQUFNLEdBQUciLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9zaXRlaHViLWFkbWluLy4vbGliL2ZpcmViYXNlQWRtaW4udHM/MTcxZiJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBhZG1pbiBmcm9tIFwiZmlyZWJhc2UtYWRtaW5cIjtcbmltcG9ydCB7IGV4aXN0c1N5bmMgfSBmcm9tIFwiZnNcIjtcbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gXCJmc1wiO1xuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcblxuZnVuY3Rpb24gbG9hZFNlcnZpY2VBY2NvdW50KCkge1xuICB0cnkge1xuICAgIGNvbnN0IHAgPSBwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgXCJmaXJlYmFzZS1zZXJ2aWNlLWFjY291bnQuanNvblwiKTtcbiAgICBpZiAoZXhpc3RzU3luYyhwKSkge1xuICAgICAgY29uc3QgcmF3ID0gcmVhZEZpbGVTeW5jKHAsIFwidXRmOFwiKTtcbiAgICAgIHJldHVybiBKU09OLnBhcnNlKHJhdyk7XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgLy8gaWdub3JlIGFuZCBmYWxsYmFjayB0byBlbnZcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuaWYgKCFhZG1pbi5hcHBzLmxlbmd0aCkge1xuICBjb25zdCBzZXJ2aWNlQWNjb3VudCA9IGxvYWRTZXJ2aWNlQWNjb3VudCgpO1xuXG4gIGlmIChzZXJ2aWNlQWNjb3VudCkge1xuICAgIGFkbWluLmluaXRpYWxpemVBcHAoe1xuICAgICAgY3JlZGVudGlhbDogYWRtaW4uY3JlZGVudGlhbC5jZXJ0KHNlcnZpY2VBY2NvdW50IGFzIGFueSksXG4gICAgICBzdG9yYWdlQnVja2V0OiBwcm9jZXNzLmVudi5GSVJFQkFTRV9TVE9SQUdFX0JVQ0tFVCB8fCBzZXJ2aWNlQWNjb3VudC5wcm9qZWN0X2lkICsgXCIuYXBwc3BvdC5jb21cIixcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICBhZG1pbi5pbml0aWFsaXplQXBwKHtcbiAgICAgIGNyZWRlbnRpYWw6IGFkbWluLmNyZWRlbnRpYWwuY2VydCh7XG4gICAgICAgIHByb2plY3RJZDogcHJvY2Vzcy5lbnYuRklSRUJBU0VfUFJPSkVDVF9JRCxcbiAgICAgICAgY2xpZW50RW1haWw6IHByb2Nlc3MuZW52LkZJUkVCQVNFX0NMSUVOVF9FTUFJTCxcbiAgICAgICAgcHJpdmF0ZUtleTogcHJvY2Vzcy5lbnYuRklSRUJBU0VfUFJJVkFURV9LRVk/LnJlcGxhY2UoL1xcXFxuL2csIFwiXFxuXCIpLFxuICAgICAgfSksXG4gICAgICBzdG9yYWdlQnVja2V0OiBwcm9jZXNzLmVudi5GSVJFQkFTRV9TVE9SQUdFX0JVQ0tFVCxcbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgY29uc3QgZGIgPSBhZG1pbi5maXJlc3RvcmUoKTtcbmV4cG9ydCBjb25zdCBidWNrZXQgPSBhZG1pbi5zdG9yYWdlKCkuYnVja2V0KCk7XG4iXSwibmFtZXMiOlsiYWRtaW4iLCJleGlzdHNTeW5jIiwicmVhZEZpbGVTeW5jIiwicGF0aCIsImxvYWRTZXJ2aWNlQWNjb3VudCIsInAiLCJyZXNvbHZlIiwicHJvY2VzcyIsImN3ZCIsInJhdyIsIkpTT04iLCJwYXJzZSIsImUiLCJhcHBzIiwibGVuZ3RoIiwic2VydmljZUFjY291bnQiLCJpbml0aWFsaXplQXBwIiwiY3JlZGVudGlhbCIsImNlcnQiLCJzdG9yYWdlQnVja2V0IiwiZW52IiwiRklSRUJBU0VfU1RPUkFHRV9CVUNLRVQiLCJwcm9qZWN0X2lkIiwicHJvamVjdElkIiwiRklSRUJBU0VfUFJPSkVDVF9JRCIsImNsaWVudEVtYWlsIiwiRklSRUJBU0VfQ0xJRU5UX0VNQUlMIiwicHJpdmF0ZUtleSIsIkZJUkVCQVNFX1BSSVZBVEVfS0VZIiwicmVwbGFjZSIsImRiIiwiZmlyZXN0b3JlIiwiYnVja2V0Iiwic3RvcmFnZSJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./lib/firebaseAdmin.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@opentelemetry","vendor-chunks/next-auth","vendor-chunks/@babel","vendor-chunks/jose","vendor-chunks/openid-client","vendor-chunks/oauth","vendor-chunks/object-hash","vendor-chunks/preact","vendor-chunks/uuid","vendor-chunks/preact-render-to-string","vendor-chunks/cookie","vendor-chunks/oidc-token-hash","vendor-chunks/@panva"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fadmin%2Ffirestore-counts%2Froute&page=%2Fapi%2Fadmin%2Ffirestore-counts%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fadmin%2Ffirestore-counts%2Froute.ts&appDir=%2FUsers%2Fsteven_hukelight%2Fsitehub-admin%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fsteven_hukelight%2Fsitehub-admin&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();