import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDeb } from "@electron-forge/maker-deb";

const config: ForgeConfig = {
  packagerConfig: {
    name: "as",
    executableName: "as",
    icon: "./resources/icon",
    asar: true,
  },
  makers: [
    new MakerSquirrel({ name: "as" }),
    new MakerZIP({}, ["darwin"]),
    new MakerDeb({ options: { name: "as-messenger" } }),
  ],
};

export default config;
