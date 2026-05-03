# 图片实验室

这份文档用于测试图片检查面板。

## 本地图片

下面这张图片引用了仓库内已有 SVG。图片检查面板应识别为相对路径，并解析本地路径。

![Markdown Reader demo image](../assets/markdown-reader.svg)

## 网络图片

下面是一个网络图片 URL。它不一定需要加载成功，但图片检查面板应识别为网络图片。

![Remote placeholder](https://example.com/demo-image.png)

## 空图片

下面这一项用于健康检查和图片检查，应该报告空 src：

![]()

## 下一步

继续查看 [[05-health-check-lab]]。

