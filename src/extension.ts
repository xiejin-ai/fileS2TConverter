// src/extension.ts
import * as vscode from 'vscode';
import fs from 'fs';
import path from 'path';

import  OpenCC from 'opencc-js';

// 创建一个 Map 来存储每个工作区的监听器
const watchers = new Map<string, vscode.FileSystemWatcher>();

/**
 * 激活扩展
 * @param context 扩展上下文
 */
export function activate(context: vscode.ExtensionContext) {
  
 
  
  // 注册开始监测命令
  let startDisposable = vscode.commands.registerCommand('fileS2TConverter.start', async () => {
    // 获取当前活动的工作区
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage('请打开一个工作区以使用此扩展。');
      return;
    }

 

    const workspacePath = workspaceFolders[0].uri.fsPath;

    // 检查是否已经有监听器在运行
    if (watchers.has(workspacePath)) {
      vscode.window.showInformationMessage('该工作区的监听器已在运行。');
      return;
    }

    // 获取用户配置的输入和输出文件夹
    const config = vscode.workspace.getConfiguration('fileS2TConverter');
    const inputFolder = config.get<string>('inputFolder');
    const outputFolder = config.get<string>('outputFolder');
    const fileSuffixList = config.get<string[]>('fileSuffixList');

    if (!inputFolder || !outputFolder) {
      vscode.window.showErrorMessage('请在设置中配置输入和输出文件夹路径。');
      return;
    }
   

    const absoluteInputPath = path.isAbsolute(inputFolder)
      ? inputFolder
      : path.join(workspacePath, inputFolder);
    const absoluteOutputPath = path.isAbsolute(outputFolder)
      ? outputFolder
      : path.join(workspacePath, outputFolder);

    // 检查输入文件夹是否存在
    if (!fs.existsSync(absoluteInputPath)) {
      vscode.window.showErrorMessage(`输入文件夹不存在: ${absoluteInputPath}`);
      return;
    }

    // 确保输出文件夹存在
    if (!fs.existsSync(absoluteOutputPath)) {
      fs.mkdirSync(absoluteOutputPath, { recursive: true });
    }

    
    // 创建 FileSystemWatcher 仅监听输入文件夹
    const watcher = vscode.workspace.createFileSystemWatcher(fileSuffixList&& fileSuffixList?.length > 0? `**/*.${fileSuffixList.join(',')}`: '**/*', false, false, false);

    // 处理文件变化的函数
    const handleFileChange = async (uri: vscode.Uri) => {


 
      const filePath = uri.fsPath;

      // 检查文件是否位于输出文件夹中，如果是，则忽略
      if (filePath.startsWith(path.resolve(absoluteOutputPath))) {
        return;
      }

      console.log(`检测到文件变化: ${filePath}`);

      // 读取文件内容
      let fileContent: string;
      try {
        fileContent = fs.readFileSync(filePath, 'utf-8');
      } catch (error) {
        vscode.window.showErrorMessage(`读取文件失败: ${filePath}`);
        return;
      }

      // // 解析 JSON
      // let jsonData: any;
      // try {
      //   jsonData = JSON.parse(fileContent);
      // } catch (error) {
      //   vscode.window.showErrorMessage(`解析 JSON 失败: ${filePath}`);
      //   return;
      // }

      // // 转换 JSON
      // let convertedData: any;
      // try {
      //   convertedData = await convertJsonToTraditional(jsonData);
      // } catch (error) {
      //   vscode.window.showErrorMessage(`转换 JSON 失败: ${filePath}`);
      //   return;
      // }
      // 生成转换器
      const converter = OpenCC.Converter(
        { from: 'cn', to: 'hk' }
      );
      

      const convertedData = await converter(fileContent);
      // 生成输出文件路径
      const relativePath = path.relative(absoluteInputPath, filePath);
      const outputFilePath = path.join(absoluteOutputPath, relativePath);

      // 确保输出子文件夹存在
      const outputDir = path.dirname(outputFilePath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      console.log(fileContent,convertedData)
      // 写入转换后的 JSON
      try {
        fs.writeFileSync(outputFilePath, convertedData, 'utf-8');
        vscode.window.showInformationMessage(`转换完成并输出到: ${outputFilePath}`);
      } catch (error) {
        vscode.window.showErrorMessage(`写入文件失败: ${outputFilePath}`);
      }
    };

    // 绑定事件
    watcher.onDidCreate(handleFileChange);
    watcher.onDidChange(handleFileChange);
    watcher.onDidDelete(uri => {
      const filePath = uri.fsPath;

      // 检查文件是否位于输出文件夹中，如果是，则忽略
      if (filePath.startsWith(path.resolve(absoluteOutputPath))) {
        return;
      }

      const relativePath = path.relative(absoluteInputPath, filePath);
      const outputFilePath = path.join(absoluteOutputPath, relativePath);
      if (fs.existsSync(outputFilePath)) {
        fs.unlinkSync(outputFilePath);
        vscode.window.showInformationMessage(`删除输出文件: ${outputFilePath}`);
      }
    });

    // 添加 watcher 到 Map
    watchers.set(workspacePath, watcher);

    // 添加 watcher 到 context 以便在扩展停用时自动关闭
    context.subscriptions.push(watcher);

    vscode.window.showInformationMessage(`开始监测文件夹: ${absoluteInputPath}`);
    vscode.window.showInformationMessage(`转换后的文件将输出到: ${absoluteOutputPath}`);
  });

  // 注册停止监测命令
  let stopDisposable = vscode.commands.registerCommand('fileS2TConverter.stop', async () => {
    // 获取当前活动的工作区
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage('请打开一个工作区以使用此扩展。');
      return;
    }

    const workspacePath = workspaceFolders[0].uri.fsPath;

    // 检查是否有监听器在运行
    if (!watchers.has(workspacePath)) {
      vscode.window.showInformationMessage('该工作区没有运行中的监听器。');
      return;
    }

    // 获取并 dispose 监听器
    const watcher = watchers.get(workspacePath);
    watcher?.dispose();
    watchers.delete(workspacePath);

    vscode.window.showInformationMessage(`已停止监测工作区: ${workspacePath}`);
  });

  context.subscriptions.push(startDisposable);
  context.subscriptions.push(stopDisposable);
}

/**
 * 取消激活扩展
 */
export function deactivate() {
  // 清理所有监听器
  watchers.forEach(watcher => watcher.dispose());
  watchers.clear();
}
