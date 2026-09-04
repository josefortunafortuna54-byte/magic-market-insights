const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

// Com a arte full-screen do splash (splash-full.png), o windowBackground
// TEM de apontar para @drawable/splashscreen_logo — é isso que faz a imagem
// preencher a janela no arranque. Antes trocava para ic_launcher_background
// porque o logo antigo era pequeno e ficava esticado.
module.exports = function fixSplashWindow(config) {
  return withDangerousMod(config, [
    "android",
    (mod) => {
      const stylesPath = path.join(
        mod.modRequest.platformProjectRoot,
        "app/src/main/res/values/styles.xml"
      );
      if (fs.existsSync(stylesPath)) {
        let contents = fs.readFileSync(stylesPath, "utf-8");
        // Garante windowBackground = arte full-screen (idempotente)
        contents = contents.replace(
          /<item name="android:windowBackground">@drawable\/ic_launcher_background<\/item>/g,
          '<item name="android:windowBackground">@drawable/splashscreen_logo</item>'
        );
        fs.writeFileSync(stylesPath, contents, "utf-8");
      }
      return mod;
    },
  ]);
};
