const { execSync } = require("child_process");

// Last git commit date (YYYY-MM-DD) for a source file. Returns "" if git
// history is unavailable or shallow, so we never publish a misleading lastmod.
let shallow = null;
function gitLastMod(inputPath) {
  try {
    if (shallow === null) {
      shallow = execSync("git rev-parse --is-shallow-repository", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim() !== "false";
    }
    if (shallow) return "";
    const out = execSync(`git log -1 --format=%cs -- "${inputPath}"`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    return out;
  } catch (e) {
    return "";
  }
}

module.exports = function(eleventyConfig) {
  eleventyConfig.addFilter("gitLastMod", gitLastMod);
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy({"src/favicon*": "/"});

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_includes/layouts"
    },
    templateFormats: ["njk", "md", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
};
