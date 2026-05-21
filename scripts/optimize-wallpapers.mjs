#!/usr/bin/env node
/**
 * 一次性脚本: 把 public/images/wallpapers 下的所有图片压缩成 webp
 * - 输入: background1.jpg / background2.png / ... / background14.bmp / background15.jpg
 * - 输出: 同目录下的 background1.webp ... background15.webp
 *
 * 完成后:
 *   - 删除原文件 (DELETE_SOURCE = true)
 *   - 体积大约能从 77 MB 缩到 5-15 MB
 *
 * BMP 处理:
 *   sharp 默认不支持 BMP, 这里先用 PowerShell + System.Drawing 把 BMP 转成临时 PNG,
 *   再喂给 sharp.
 *
 * 用法: node scripts/optimize-wallpapers.mjs
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const WALLPAPER_DIR = join(ROOT, "public", "images", "wallpapers");
const TMP_DIR = join(ROOT, "temp-wallpaper-convert");

const QUALITY = 82; // webp 质量 (1-100)
const MAX_WIDTH = 2560; // 最大宽度, 超过会等比缩小, 节省体积
const DELETE_SOURCE = true;

// sharp 是 next 的 transitive 依赖, 不在主 package.json 里, 需要从 .pnpm 路径加载
const sharpPath = join(
  ROOT,
  "node_modules",
  ".pnpm",
  "sharp@0.34.5",
  "node_modules",
  "sharp",
  "lib",
  "index.js",
);
const sharp = (await import(`file://${sharpPath.replace(/\\/g, "/")}`)).default;

function fmtMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(2);
}

function bmpToPng(inputPath, outputPath) {
  // 用 PowerShell + System.Drawing 把 BMP 解码到 PNG
  const ps = [
    "Add-Type -AssemblyName System.Drawing;",
    `$img = [System.Drawing.Image]::FromFile('${inputPath.replace(/'/g, "''")}');`,
    `$img.Save('${outputPath.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png);`,
    "$img.Dispose();",
  ].join(" ");
  execSync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${ps}"`, {
    stdio: "pipe",
    encoding: "utf8",
  });
}

async function main() {
  if (!existsSync(WALLPAPER_DIR)) {
    console.error("找不到目录:", WALLPAPER_DIR);
    process.exit(1);
  }
  if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });

  const entries = readdirSync(WALLPAPER_DIR)
    .filter((f) => /^background\d+\.(jpe?g|png|bmp)$/i.test(f))
    .sort((a, b) => {
      const an = parseInt(a.match(/\d+/)[0], 10);
      const bn = parseInt(b.match(/\d+/)[0], 10);
      return an - bn;
    });

  if (entries.length === 0) {
    console.error("没找到 backgroundN.{jpg,png,bmp} 文件");
    process.exit(1);
  }

  console.log(`找到 ${entries.length} 张壁纸, 开始转换...`);

  let totalIn = 0;
  let totalOut = 0;
  const removed = [];

  for (const entry of entries) {
    const idx = entry.match(/^background(\d+)/i)[1];
    const inputPath = join(WALLPAPER_DIR, entry);
    const outputPath = join(WALLPAPER_DIR, `background${idx}.webp`);
    const ext = extname(entry).toLowerCase();
    const inSize = statSync(inputPath).size;
    totalIn += inSize;

    let sharpInput = inputPath;
    let tmpPng = null;

    try {
      if (ext === ".bmp") {
        tmpPng = join(TMP_DIR, `background${idx}.png`);
        console.log(`  background${idx}.bmp -> 先解码为临时 PNG ...`);
        bmpToPng(inputPath, tmpPng);
        sharpInput = tmpPng;
      }

      await sharp(sharpInput, { failOn: "none" })
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: QUALITY, effort: 5 })
        .toFile(outputPath);

      const outSize = statSync(outputPath).size;
      totalOut += outSize;
      const ratio = ((outSize / inSize) * 100).toFixed(1);
      console.log(
        `  ✓ background${idx}: ${entry} (${fmtMB(inSize)} MB) -> background${idx}.webp (${fmtMB(outSize)} MB, ${ratio}%)`,
      );

      if (DELETE_SOURCE) {
        unlinkSync(inputPath);
        removed.push(entry);
      }
    } catch (err) {
      console.error(`  ✗ ${entry} 转换失败:`, err.message);
      totalOut += inSize; // 算到原大小, 避免数据失真
    } finally {
      if (tmpPng && existsSync(tmpPng)) {
        try {
          unlinkSync(tmpPng);
        } catch (_) {
          /* ignore */
        }
      }
    }
  }

  // 清理 tmp 目录
  try {
    if (existsSync(TMP_DIR) && readdirSync(TMP_DIR).length === 0) {
      execSync(`powershell -NoProfile -Command "Remove-Item '${TMP_DIR}' -Force -Recurse"`);
    }
  } catch (_) {
    /* ignore */
  }

  console.log("");
  console.log("汇总:");
  console.log(`  输入总大小: ${fmtMB(totalIn)} MB`);
  console.log(`  输出总大小: ${fmtMB(totalOut)} MB`);
  console.log(`  压缩比:    ${((totalOut / totalIn) * 100).toFixed(1)}%`);
  if (removed.length) {
    console.log(`  已删除原图: ${removed.length} 个`);
  }
}

main().catch((err) => {
  console.error("脚本失败:", err);
  process.exit(1);
});
