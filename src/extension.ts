// src/extension.ts
import * as vscode from 'vscode';
import fs from 'fs';
import path from 'path';
import OpenCC from 'opencc-js';




// 创建一个 Map 来存储每个工作区的监听器
const watchers = new Map<string, vscode.FileSystemWatcher>();

interface OutputConfig {
  folder: string;
  language: string;
  isOpencc: boolean;
}

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
    const outputConfigs = config.get<OutputConfig[]>('outputConfigs');
    const apiKey = config.get<string>('apiKey');

    if (!inputFolder || !outputConfigs || outputConfigs.length === 0) {
      vscode.window.showErrorMessage('请在设置中配置输入文件夹和至少一个输出配置。');
      return;
    }
    if (!apiKey) {
      vscode.window.showErrorMessage('请在设置中配置 API 密钥。');
      return;
    }
   

    const absoluteInputPath = path.isAbsolute(inputFolder)
      ? inputFolder
      : path.join(workspacePath, inputFolder);

    // 检查输入文件夹是否存在
    if (!fs.existsSync(absoluteInputPath)) {
      vscode.window.showErrorMessage(`输入文件夹不存在: ${absoluteInputPath}`);
      return;
    }

    // 确保所有输出文件夹存在
    for (const outputConfig of outputConfigs) {
      const absoluteOutputPath = path.isAbsolute(outputConfig.folder)
        ? outputConfig.folder
        : path.join(workspacePath, outputConfig.folder);
      if (!fs.existsSync(absoluteOutputPath)) {
        fs.mkdirSync(absoluteOutputPath, { recursive: true });
      }
    }

    // 创建 FileSystemWatcher
    const watcher = vscode.workspace.createFileSystemWatcher(
      `**/${inputFolder}/*.json`,
      false,
      false,
      false
    );

    // 处理文件变化的函数
    const handleFileChange = async (uri: vscode.Uri) => {
      // 获取用户配置
      // 调用 handleFileConversion 函数
      await handleFileConversion(uri.fsPath, outputConfigs, workspacePath, apiKey);
    };

    // 绑定事件
    watcher.onDidCreate(handleFileChange);
    watcher.onDidChange(handleFileChange);
    watcher.onDidDelete(uri => {
      const filePath = uri.fsPath;
      // 检查文件是否位于输出文件夹中，如果是，则忽略
      for (const outputConfig of outputConfigs) {
        const absoluteOutputPath = path.isAbsolute(outputConfig.folder)
          ? outputConfig.folder
          : path.join(workspacePath, outputConfig.folder);
        
        if (filePath.startsWith(path.resolve(absoluteOutputPath))) {
          return;
        }

        const relativePath = path.relative(absoluteInputPath, filePath);
        const outputFilePath = path.join(absoluteOutputPath, relativePath);
        if (fs.existsSync(outputFilePath)) {
          fs.unlinkSync(outputFilePath);
          vscode.window.showInformationMessage(`删除输出文件: ${outputFilePath}`);
        }
      }
    });

    // 添加 watcher 到 Map
    watchers.set(workspacePath, watcher);

    // 添加 watcher 到 context 以便在扩展停用时自动关闭
    context.subscriptions.push(watcher);
    vscode.window.showInformationMessage(`开始监测文件夹: ${absoluteInputPath}`);
    for (const outputConfig of outputConfigs) {
      const absoluteOutputPath = path.isAbsolute(outputConfig.folder)
        ? outputConfig.folder
        : path.join(workspacePath, outputConfig.folder);
      vscode.window.showInformationMessage(`转换后的文件将输出到: ${absoluteOutputPath}`);
    }
  });

  // 注册停止监测命令
  let stopDisposable = vscode.commands.registerCommand('fileS2TConverter.stop', async () => {
    // 取当前活动的工作区
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

  // 注册直接执行转换的命令
  let convertDisposable = vscode.commands.registerCommand('fileS2TConverter.convert', async () => {
    // 获取当前活动的工作区
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage('请打开一个工作区以使用此扩展。');
      return;
    }

    const workspacePath = workspaceFolders[0].uri.fsPath;

    // 获取用户配置
    const config = vscode.workspace.getConfiguration('fileS2TConverter');
    const inputFolder = config.get<string>('inputFolder');
    const outputConfigs = config.get<OutputConfig[]>('outputConfigs');
    const apiKey = config.get<string>('apiKey');

    if (!inputFolder || !outputConfigs || outputConfigs.length === 0) {
      vscode.window.showErrorMessage('请在设置中配置输入文件夹和至少一个输出配置。');
      return;
    }
    if (!apiKey) {
      vscode.window.showErrorMessage('请在设置中配置 API 密钥。');
      return;
    }

    const absoluteInputPath = path.isAbsolute(inputFolder)
      ? inputFolder
      : path.join(workspacePath, inputFolder);

    // 检查输入文件夹是否存在
    if (!fs.existsSync(absoluteInputPath)) {
      vscode.window.showErrorMessage(`输入文件夹��存在: ${absoluteInputPath}`);
      return;
    }

    // 获取输入文件夹中的所有 JSON 文件
    const files = fs.readdirSync(absoluteInputPath).filter(file => file.endsWith('.json'));

    for (const file of files) {
      const inputFilePath = path.join(absoluteInputPath, file);
      await handleFileConversion(inputFilePath, outputConfigs, workspacePath, apiKey);
    }

    vscode.window.showInformationMessage('转换完成！');
  });

  // 注册选中当前文件进行翻译的命令
  let convertCurrentFileDisposable = vscode.commands.registerCommand('fileS2TConverter.convertCurrentFile', async () => {
    // 获取当前活动的编辑器
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('请打开一个文件以使用此命令。');
      return;
    }

    // 获取当前文件的路径
    const currentFilePath = editor.document.uri.fsPath;

    // 检查文件是否为 JSON 文件
    if (!currentFilePath.endsWith('.json')) {
      vscode.window.showErrorMessage('此命令只能用于 JSON 文件。');
      return;
    }

    // 获取工作区路径
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage('请打工作区以使用此扩。');
      return;
    }
    const workspacePath = workspaceFolders[0].uri.fsPath;

    // 获取用户配置
    const config = vscode.workspace.getConfiguration('fileS2TConverter');
    const inputFolder = config.get<string>('inputFolder');
    const outputConfigs = config.get<OutputConfig[]>('outputConfigs');
    const apiKey = config.get<string>('apiKey');

    if (!inputFolder) {
      vscode.window.showErrorMessage('请在设置中配置输入文件夹。');
      return;
    }
    if (!outputConfigs || outputConfigs.length === 0) {
      vscode.window.showErrorMessage('请在设置中配置至少一个输出配置。');
      return;
    }
    if (!apiKey) {
      vscode.window.showErrorMessage('请在设置中配置 API 密钥。');
      return;
    }

    // 检查当前文件是否在输入文件夹中
    const absoluteInputPath = path.isAbsolute(inputFolder)
      ? inputFolder
      : path.join(workspacePath, inputFolder);
    
    if (!currentFilePath.startsWith(absoluteInputPath)) {
      vscode.window.showErrorMessage('当前文件不在配置的输入文件夹中。');
      return;
    }

    // 调用 handleFileConversion 函数处理当前文件
    await handleFileConversion(currentFilePath, outputConfigs, workspacePath, apiKey);

    vscode.window.showInformationMessage('当前文件转换完成！');
  });

  context.subscriptions.push(startDisposable);
  context.subscriptions.push(stopDisposable);
  context.subscriptions.push(convertDisposable);
  context.subscriptions.push(convertCurrentFileDisposable);
}



/**
 * 取消激活扩展
 */
export function deactivate() {
  // 清理所有监听器
  watchers.forEach(watcher => watcher.dispose());
  watchers.clear();
}

// 添加新的辅助函数，用于计算 JSON 字符串的完整长度
function calculateJsonStringLength(obj: object): number {
  return JSON.stringify(obj).length;
}

// 修改分割函数，考虑完整的 JSON 字符串长度
function splitJsonByLength(jsonObj: { [key: string]: string }, maxLength: number = 4000): Array<{ [key: string]: string }> {
  const batches: Array<{ [key: string]: string }> = [];
  let currentBatch: { [key: string]: string } = {};

  for (const [key, value] of Object.entries(jsonObj)) {
    // 创建临时对象来测试添加新项后的长度
    const tempBatch = { ...currentBatch, [key]: value };
    const tempLength = calculateJsonStringLength(tempBatch);

    // 如果当前项单独的长度就超过限制
    const singleItemLength = calculateJsonStringLength({ [key]: value });
    if (singleItemLength > maxLength) {
      console.warn(`警告：键 "${key}" 的完整 JSON 长度(${singleItemLength})超过最大限制(${maxLength})`);
      // 如果当前批次有内容，先保存
      if (Object.keys(currentBatch).length > 0) {
        batches.push(currentBatch);
        currentBatch = {};
      }
      // 将大型项目单独作为一个批次
      batches.push({ [key]: value });
      continue;
    }

    // 如果添加新项后会超过限制，创建新的批次
    if (tempLength > maxLength) {
      batches.push(currentBatch);
      currentBatch = { [key]: value };
    } else {
      currentBatch[key] = value;
    }
  }

  // 添加最后一个批次（如果有的话）
  if (Object.keys(currentBatch).length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

// 修改后的 translateJson 函数
async function translateJson(jsonObj: any, from: string = 'zh', to: string = 'en', apiKey: string): Promise<any> {
  const batches = splitJsonByLength(jsonObj);
  const results: { [key: string]: string } = {};
  const totalBatches = batches.length;

  vscode.window.showInformationMessage(`开始翻译，共 ${totalBatches} 个批次`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    
    try {
      const url = 'http://api.niutrans.com/NiuTransServer/translationJson';
      const requestBody = {
        from,
        to,
        apikey: apiKey,
        src_text: batch
      };

 
      logBatchInfo(batch, i + 1,totalBatches);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP 错误！状态: ${response.status}`);
      }

      const data = await response.json();

      if (data && data.tgt_text) {
        Object.assign(results, data.tgt_text);
      } else {
        throw new Error('翻译失败：未收到预期的响应数据');
      }

      // 添加延迟以避免请求过于频繁
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error:any) {
      console.error(`批次 ${i + 1} 翻译出错：`, error);
      vscode.window.showErrorMessage(`批次 ${i + 1} 翻译失败：${error.message}`);
      
      // 如果是最后一个批次失败，抛出错误
      // 否则继续处理下一个批次
      if (i === batches.length - 1) {
        throw error;
      }
    }
  }

  vscode.window.showInformationMessage('所有批次翻译完成');
  return results;
}

// 添加调试信息的辅助函数
function logBatchInfo(batch: { [key: string]: string }, index: number, total: number) {
  const batchLength = calculateJsonStringLength(batch);
  const details = Object.entries(batch).map(([key, value]) => {
    const itemLength = calculateJsonStringLength({ [key]: value });
    return `${key}: ${itemLength} 字符`;
  }).join('\n');

 vscode.window.showInformationMessage(`
批次 ${index + 1}/${total}
总长度: ${batchLength} 字符
项目详情:
${details}
------------------------`);
}

// 在 convertJsonRecursively 函数中添加调试信息
async function convertJsonRecursively(input: any, output: any, apiKey: string, to: string = 'en',isOpencc: boolean = false): Promise<any> {
  const textsToTranslate: { [key: string]: string } = {};
  const paths: string[] = [];

  // 递归收集需要翻译的文本
  function collectTextsToTranslate(src: any, dest: any, path: string = '') {
    if (typeof src === 'string') {
      // 只有当目标不存在或与源文本不同时才收集
      if (!dest ) {
        textsToTranslate[path] = src;
        paths.push(path);
      }
    } else if (Array.isArray(src)) {
      src.forEach((item, index) => {
        const destItem = dest && Array.isArray(dest) ? dest[index] : undefined;
        collectTextsToTranslate(item, destItem, `${path}[${index}]`);
      });
    } else if (typeof src === 'object' && src !== null) {
      for (const key in src) {
        const destValue = dest && typeof dest === 'object' ? dest[key] : undefined;
        collectTextsToTranslate(src[key], destValue, path ? `${path}.${key}` : key);
      }
    }
  }

  collectTextsToTranslate(input, output);

  // 如果有需要翻译的文本，使用 translateJson 进行翻译
  if (Object.keys(textsToTranslate).length > 0) {
    const totalLength = calculateJsonStringLength(textsToTranslate);
    console.log(`需要翻译的文本数量: ${Object.keys(textsToTranslate).length}`);
    console.log(`需要翻译的总文本长度: ${totalLength} 字符`);
    vscode.window.showInformationMessage(`发现 ${Object.keys(textsToTranslate).length} 个需要翻译的文本;需要翻译的总文本长度: ${totalLength} 字符`);


    try {
      let translatedJson:any;
      if(!isOpencc){
        translatedJson = await translateJson(textsToTranslate, 'zh', to, apiKey);
      }else{
        const opencc = OpenCC.Converter({ from: 'cn', to: to as any });
        translatedJson =JSON.parse(opencc(JSON.stringify(textsToTranslate)));
      }

      
      // 将翻译结果应用到原始结构中
      function applyTranslations(src: any, dest: any = {}): any {
        if (typeof src === 'string') {
          const path = paths.find(p => src === textsToTranslate[p]);
          // 如果找到对应的翻译，使用翻译结果；否则使用目标中已有的值或源值
          return path ? translatedJson[path] : (dest || src);
        } else if (Array.isArray(src)) {
          return src.map((item, index) => 
            applyTranslations(item, dest && Array.isArray(dest) ? dest[index] : undefined)
          );
        } else if (typeof src === 'object' && src !== null) {
          const result: any = {};
          for (const key in src) {
            result[key] = applyTranslations(
              src[key], 
              dest && typeof dest === 'object' ? dest[key] : undefined
            );
          }
          return result;
        }
        return src;
      }

      const result = applyTranslations(input, output);
      return result;

    } catch (error :any) {
      console.error('JSON 翻译失败：', error);
      vscode.window.showErrorMessage(`JSON 翻译失败：${error.message}`);
      
      // 在失败时返回组合的结果：保留已有的翻译，未翻译的部分保持原文
      return mergeWithExisting(input, output);
    }
  } else {
    console.log('没有需要翻译的新文本');
    vscode.window.showInformationMessage('没有需要翻译的新文本');
    return output || input;
  }
}

// 辅助函数：合并现有翻译和原始文本
function mergeWithExisting(input: any, output: any): any {
  if (typeof input === 'string') {
    return output || input;
  } else if (Array.isArray(input)) {
    return input.map((item, index) => 
      mergeWithExisting(item, output && Array.isArray(output) ? output[index] : undefined)
    );
  } else if (typeof input === 'object' && input !== null) {
    const result: any = {};
    for (const key in input) {
      result[key] = mergeWithExisting(
        input[key], 
        output && typeof output === 'object' ? output[key] : undefined
      );
    }
    return result;
  }
  return input;
}

// 修改 handleFileConversion 函数
async function handleFileConversion(inputFilePath: string, outputConfigs: OutputConfig[], workspacePath: string, apiKey: string) {
  // 读取输入文件内容
  let inputJson: any;
  try {
    const fileContent = fs.readFileSync(inputFilePath, 'utf-8');
    inputJson = JSON.parse(fileContent);
  } catch (error) {
    vscode.window.showErrorMessage(`读取或解析输入 JSON 文件失败: ${inputFilePath}`);
    return;
  }

  // 对每个输出配置进行处理
  for (const outputConfig of outputConfigs) {
    const absoluteOutputPath = path.isAbsolute(outputConfig.folder)
      ? outputConfig.folder
      : path.join(workspacePath, outputConfig.folder);
    
    const relativePath = path.relative(path.dirname(inputFilePath), inputFilePath);
    const outputFilePath = path.join(absoluteOutputPath, relativePath);

    // 检查输出文件是否存在
    let outputJson: any = {};
    if (fs.existsSync(outputFilePath)) {
      try {
        const outputContent = fs.readFileSync(outputFilePath, 'utf-8');
        outputJson = JSON.parse(outputContent);
      } catch (error) {
        vscode.window.showErrorMessage(`读取或解析输出 JSON 文件失败: ${outputFilePath}`);
        continue;
      }
    }
      const convertedJson = await convertJsonRecursively(inputJson, outputJson, apiKey, outputConfig.language,outputConfig.isOpencc);
      outputJson = convertedJson;
  

    // 确保输出子文件夹存在
    const outputDir = path.dirname(outputFilePath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 写入转换后的 JSON
    try {
      fs.writeFileSync(outputFilePath, JSON.stringify(outputJson, null, 2), 'utf-8');
      vscode.window.showInformationMessage(`转换完成并输出到: ${outputFilePath}`);
    } catch (error) {
      vscode.window.showErrorMessage(`写入文件失败: ${outputFilePath}`);
    }
  }
}

// 使用示例
// const apiKey = '您的apikey';
// translateText('你好', 'zh', 'en', apiKey)
//   .then(result => console.log(result))
//   .catch(error => console.error('翻译出错：', error));

// 使用示例
// translateApi('你好', 'zh', 'en')
//   .then(result => console.log(result))
//   .catch(error => console.error('翻译出错：', error));

// 使用示例
// const jsonToTranslate = {
//   "niutrans": {
//     "description": {
//       "name": "Nice translator！"
//     }
//   }
// };
// translateJson(jsonToTranslate, 'en', 'zh', apiKey)
//   .then(result => console.log(result))
//   .catch(error => console.error('翻译 JSON 出错：', error));









