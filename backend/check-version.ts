import { log } from "./log";
import compareVersions from "compare-versions";
import packageJSON from "../package.json";
import { Settings } from "./settings";

// How much time in ms to wait between update checks
const UPDATE_CHECKER_INTERVAL_MS = 1000 * 60 * 60 * 48;
// Version check is disabled for this fork
// const CHECK_URL = "https://dockge.kuma.pet/version";

class CheckVersion {
    version = packageJSON.version;
    latestVersion?: string;
    interval?: NodeJS.Timeout;

    async startInterval() {
        // Version check is disabled for this fork
        log.info("update-checker", "Version check is disabled for this fork");
        return;
    }
}

const checkVersion = new CheckVersion();
export default checkVersion;
