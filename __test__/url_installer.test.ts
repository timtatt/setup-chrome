import fs from "node:fs";
import path from "node:path";
import * as httpm from "@actions/http-client";
import * as tc from "@actions/tool-cache";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import * as cache from "../src/cache";
import { URLInstaller } from "../src/url_installer";

const getJsonSpy = vi.spyOn(httpm.HttpClient.prototype, "getJson");
const tcExtractZipSpy = vi.spyOn(tc, "extractZip");
const tcDownloadToolSpy = vi.spyOn(tc, "downloadTool");
const cacheFindSpy = vi.spyOn(cache, "find");
const cacheCacheDirSpy = vi.spyOn(cache, "cacheDir");

beforeEach(() => {
  const mockDataPath = path.join(
    __dirname,
    "data/known-good-versions-with-downloads.json",
  );

  getJsonSpy.mockImplementation(async () => {
    return {
      statusCode: 200,
      headers: {},
      result: JSON.parse(await fs.promises.readFile(mockDataPath, "utf-8")),
    };
  });
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("URLInstaller", () => {
  const installer = new URLInstaller(
    {
      os: "linux",
      arch: "amd64",
    },
    { resolveBrowserVersionOnly: false },
  );

  test("checkInstalledBrowser should return installed path if installed", async () => {
    cacheFindSpy.mockResolvedValue(
      "/opt/hostedtoolcache/setup-chrome/chromium/aa2e0510b66edff7f05e2b30d4f1b361/x64",
    );

    const installed = await installer.checkInstalledBrowser("https://foo.com");
    expect(installed?.root).toEqual(
      "/opt/hostedtoolcache/setup-chrome/chromium/aa2e0510b66edff7f05e2b30d4f1b361/x64",
    );
    expect(cacheFindSpy).toHaveBeenCalledWith(
      "chromium",
      "aa2e0510b66edff7f05e2b30d4f1b361",
    );
  });

  test("downloadBrowser should download browser archive", async () => {
    tcDownloadToolSpy.mockImplementation(async () => "/tmp/chromium.zip");

    const downloaded = await installer.downloadBrowser("https://foo.com");
    expect(downloaded?.archive).toEqual("/tmp/chromium.zip");
    expect(tcDownloadToolSpy).toHaveBeenCalled();
  });

  test("installDriver should install browser", async () => {
    tcExtractZipSpy.mockImplementation(async () => "/tmp/extracted");
    cacheCacheDirSpy.mockImplementation(async () => "/path/to/chromium");

    const installed = await installer.installBrowser(
      "https://foo.com",
      "/tmp/chromium.zip",
    );
    expect(installed).toEqual({ root: "/path/to/chromium", bin: "chrome" });
    expect(cacheCacheDirSpy).toHaveBeenCalledWith(
      "/tmp/extracted/chrome-linux64",
      "chromium",
      "aa2e0510b66edff7f05e2b30d4f1b361",
    );
  });

  test("checkInstalledDriver should return undefined if not installed", async () => {
    cacheFindSpy.mockResolvedValue(undefined);

    const installed = await installer.checkInstalledDriver("https://foo.com");
    expect(installed).toBeUndefined();
  });

  test("checkInstalledDriver should return installed path if installed", async () => {
    cacheFindSpy.mockResolvedValue(
      "/opt/hostedtoolcache/setup-chrome/chromedriver/aa2e0510b66edff7f05e2b30d4f1b361/x64",
    );

    const installed = await installer.checkInstalledDriver("https://foo.com");
    expect(installed?.root).toEqual(
      "/opt/hostedtoolcache/setup-chrome/chromedriver/aa2e0510b66edff7f05e2b30d4f1b361/x64",
    );
    expect(cacheFindSpy).toHaveBeenCalledWith(
      "chromedriver",
      "aa2e0510b66edff7f05e2b30d4f1b361",
    );
  });

  test("downloadDriver should download driver archive", async () => {
    tcDownloadToolSpy.mockImplementation(async () => "/tmp/chromedriver.zip");

    const downloaded = await installer.downloadDriver("https://foo.com");
    expect(downloaded?.archive).toEqual("/tmp/chromedriver.zip");
    expect(tcDownloadToolSpy).toHaveBeenCalled();
  });

  test("downloadDriver should throw an error when browser only mode", async () => {
    const installer = new URLInstaller(
      {
        os: "linux",
        arch: "amd64",
      },
      { resolveBrowserVersionOnly: true },
    );
    expect(installer.downloadDriver("https://foo.com")).rejects.toThrowError(
      "Unexpectedly trying to download chromedriver",
    );
  });

  test("installDriver should install driver", async () => {
    tcExtractZipSpy.mockImplementation(async () => "/tmp/extracted");
    cacheCacheDirSpy.mockImplementation(async () => "/path/to/chromedriver");

    const installed = await installer.installDriver(
      "https://foo.com",
      "/tmp/chromedriver.zip",
    );
    expect(installed).toEqual({
      root: "/path/to/chromedriver",
      bin: "chromedriver",
    });
    expect(cacheCacheDirSpy).toHaveBeenCalledWith(
      "/tmp/extracted/chromedriver-linux64",
      "chromedriver",
      "aa2e0510b66edff7f05e2b30d4f1b361",
    );
  });

  test("installDriver should throw an error when browser only mode", async () => {
    const installer = new URLInstaller(
      {
        os: "linux",
        arch: "amd64",
      },
      { resolveBrowserVersionOnly: true },
    );
    expect(
      installer.installDriver("120.0.6099.x", "/tmp/chromedriver.zip"),
    ).rejects.toThrowError("Unexpectedly trying to install chromedriver");
  });
});
