import { createHash } from "node:crypto";
import path from "node:path";
import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import * as cache from "./cache";
import { platformString } from "./chrome_for_testing";
import type { DownloadResult, InstallResult, Installer } from "./installer";
import { OS, type Platform } from "./platform";

export class URLInstaller implements Installer {
  private readonly platform: Platform;
  private readonly resolveBrowserVersionOnly: boolean;

  constructor(
    platform: Platform,
    { resolveBrowserVersionOnly }: { resolveBrowserVersionOnly: boolean },
  ) {
    this.platform = platform;
    this.resolveBrowserVersionOnly = resolveBrowserVersionOnly;
  }

  async checkInstalledBrowser(
    version: string,
  ): Promise<InstallResult | undefined> {
    const root = await cache.find("chromium", this.getCacheDirName(version));
    if (root) {
      return { root, bin: "chrome" };
    }
  }

  getCacheDirName(version: string): string {
    //it is hashed to create the cache dir name from a url
    return createHash("md5").update(version).digest("hex");
  }

  async downloadBrowser(url: string): Promise<DownloadResult> {
    core.info(`Acquiring chrome from ${url}`);

    const archive = await tc.downloadTool(url);
    return { archive };
  }

  async installBrowser(url: string, archive: string): Promise<InstallResult> {
    const extPath = await tc.extractZip(archive);
    const extAppRoot = path.join(
      extPath,
      `chrome-${platformString(this.platform)}`,
    );

    const root = await cache.cacheDir(
      extAppRoot,
      "chromium",
      this.getCacheDirName(url),
    );
    core.info(`Successfully Installed chromium to ${root}`);
    const bin = (() => {
      switch (this.platform.os) {
        case OS.DARWIN:
          return "Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
        case OS.LINUX:
          return "chrome";
        case OS.WINDOWS:
          return "chrome.exe";
      }
    })();
    return { root: root, bin };
  }

  async checkInstalledDriver(url: string): Promise<InstallResult | undefined> {
    const root = await cache.find("chromedriver", this.getCacheDirName(url));
    if (root) {
      return { root, bin: "chromedriver" };
    }
  }

  async downloadDriver(url: string): Promise<DownloadResult> {
    if (this.resolveBrowserVersionOnly) {
      throw new Error("Unexpectedly trying to download chromedriver");
    }

    core.info(`Acquiring chromedriver from ${url}`);

    const archive = await tc.downloadTool(url);
    return { archive };
  }

  async installDriver(url: string, archive: string): Promise<InstallResult> {
    if (this.resolveBrowserVersionOnly) {
      throw new Error("Unexpectedly trying to install chromedriver");
    }

    const extPath = await tc.extractZip(archive);
    const extAppRoot = path.join(
      extPath,
      `chromedriver-${platformString(this.platform)}`,
    );

    const root = await cache.cacheDir(
      extAppRoot,
      "chromedriver",
      this.getCacheDirName(url),
    );
    core.info(`Successfully Installed chromedriver to ${root}`);
    const bin = (() => {
      switch (this.platform.os) {
        case OS.DARWIN:
          return "chromedriver";
        case OS.LINUX:
          return "chromedriver";
        case OS.WINDOWS:
          return "chromedriver.exe";
      }
    })();
    return { root: root, bin };
  }
}
