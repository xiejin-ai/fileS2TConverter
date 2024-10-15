# 扩展名称

## 描述
File S2T Converter 是一个用于转换文件语言的 VSCode 扩展。它能够监测指定文件夹中的文件变化，并自动将文件内容从一种语言转换为另一种语言。此扩展特别适用于需要在不同语言环境下维护代码或文档的开发者。

## 功能
实时监测文件变化：监听指定文件夹中的文件创建、修改和删除事件。
自动语言转换：将文件内容从源语言自动转换为目标语言。
自定义配置：用户可以配置输入和输出文件夹路径、监听的文件后缀以及转换的语言选项。
支持多种语言：支持简体中文、繁体中文（台湾、香港）、日语等多种语言转换。
自动转换选项：可选择是否在保存文件时自动进行转换，提高工作效率。
安装
通过 VSCode 市场安装
打开 VSCode。
转到扩展视图（快捷键 Ctrl+Shift+X 或 Cmd+Shift+X）。
搜索 “File S2T Converter”。
点击 安装 按钮进行安装。

## 安装
1. 打开 VSCode。
2. 转到扩展视图 (`Ctrl+Shift+X`)。
3. 搜索“扩展名称”并安装。

## 配置
您可以通过 VSCode 的设置界面或直接编辑 settings.json 文件来配置扩展。以下是各项配置的详细说明：
设置路径: fileS2TConverter.inputFolder
默认值: i18n/zh-Hans
描述: 需要监测的输入文件夹路径。

设置路径: fileS2TConverter.outputFolder
默认值: i18n/zh-Hant
描述: 转换后输出的文件夹路径。

设置路径: fileS2TConverter.fileSuffixList
默认值: [".ts"]
描述: 需要监听的文件后缀列表。

设置路径: fileS2TConverter.langFrom
默认值: cn
描述: 转换前的语言。
可选值: cn（简体中文）、tw（繁体中文）、twp（繁体中文 - 台湾）、hk（繁体中文 - 香港）、jp（日语）、t（其他）

设置路径: fileS2TConverter.langTo
默认值: twp
描述: 转换后的语言。
可选值: cn（简体中文）、tw（繁体中文）、twp（繁体中文 - 台湾）、hk（繁体中文 - 香港）、jp（日语）、t（其他）

## 使用

打开命令面板（快捷键 Ctrl+Shift+P 或 Cmd+Shift+P）。
输入 “开始简体到繁体的转换检测” 并选择该命令。
输入 “停止简体到繁体的转换检测” 并选择该命令。