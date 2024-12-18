// 发送消息到企业微信机器人
async function sendToWecom(env, message) {
  // 如果没有配置企业微信机器人，直接返回
  if (!env.WECOM_BOT_URL) {
    return null;
  }

  try {
    // 确保消息不超过限制
    const truncatedMessage = truncateMessage(message);

    const response = await fetch(env.WECOM_BOT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        msgtype: 'text',
        text: {
          content: truncatedMessage
        }
      }),
    });

    const result = await response.json();
    if (result.errcode !== 0) {
      console.error(`企业微信机器人 API 错误: ${result.errmsg}`);
      return null;
    }

    return result;
  } catch (error) {
    console.error('发送消息到企业微信失败:', error);
    return null;
  }
}

// 格式化内容为企业微信消息（纯文本）
function formatContentForWecom(type, title, content, url = null, isEdit = false) {
  // 根据类型选择不同的emoji
  const typeEmoji = type === 'file' ? '📄' : type === 'image' ? '🖼️' : '📝';

  let message = '';
  if (isEdit) {
    message = `✏️ 内容已更新\n\n`;
  } else {
    message = `${typeEmoji} 新${type === 'file' ? '文件' : type === 'image' ? '图片' : '内容'}上传\n\n`;
  }

  message += `📌 标题: ${title}\n\n`;

  if (type === 'text' || type === 'code' || type === 'poetry') {
    message += `💬 内容:\n\n${content}`;
  } else if (type === 'file' || type === 'image') {
    message += `🔗 链接: ${url}`;
  }

  if (isEdit) {
    message += '\n\n✨ 此内容已被编辑';
  }

  return message;
}

// 截断消息以符合企业微信限制
function truncateMessage(message) {
  const MAX_LENGTH = 2048; // 企业微信文本消息长度限制

  if (message.length <= MAX_LENGTH) {
    return message;
  }

  return message.substring(0, MAX_LENGTH - 3) + '...';
}

export { sendToWecom, formatContentForWecom }; 