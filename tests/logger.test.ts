/**
 * logger 工具单元测试
 */

import { logger, setLogLevel, getLogLevel, LogLevel } from '../src/utils/logger';

describe('Structured Logger', () => {
  const originalLevel = process.env.LOG_LEVEL;

  afterEach(() => {
    if (originalLevel) process.env.LOG_LEVEL = originalLevel;
    else delete process.env.LOG_LEVEL;
    setLogLevel('info');
    jest.restoreAllMocks();
  });

  describe('日志级别控制', () => {
    it('默认级别应为 info', () => {
      expect(getLogLevel()).toBe('info');
    });

    it('setLogLevel 应改变当前级别', () => {
      setLogLevel('debug');
      expect(getLogLevel()).toBe('debug');
      setLogLevel('error');
      expect(getLogLevel()).toBe('error');
    });

    it('debug 级别下应输出所有级别', () => {
      setLogLevel('debug');
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation();
      const infoSpy = jest.spyOn(console, 'info').mockImplementation();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      logger.debug('d');
      logger.info('i');
      logger.warn('w');
      logger.error('e');

      expect(debugSpy).toHaveBeenCalled();
      expect(infoSpy).toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();
    });

    it('error 级别下只输出 error', () => {
      setLogLevel('error');
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation();
      const infoSpy = jest.spyOn(console, 'info').mockImplementation();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      logger.debug('d');
      logger.info('i');
      logger.warn('w');
      logger.error('e');

      expect(debugSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();
    });

    it('warn 级别下输出 warn 和 error，不输出 debug/info', () => {
      setLogLevel('warn');
      const infoSpy = jest.spyOn(console, 'info').mockImplementation();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      logger.info('i');
      logger.warn('w');
      logger.error('e');

      expect(infoSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('输出格式', () => {
    it('应包含 ISO 时间戳和级别标签', () => {
      setLogLevel('debug');
      const spy = jest.spyOn(console, 'info').mockImplementation();
      logger.info('测试消息');
      const output = spy.mock.calls[0][0] as string;
      expect(output).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(output).toContain('[INFO]');
      expect(output).toContain('测试消息');
    });

    it('应包含 meta 数据的 JSON', () => {
      setLogLevel('debug');
      const spy = jest.spyOn(console, 'info').mockImplementation();
      logger.info('带元数据', { userId: 123, action: 'test' });
      const output = spy.mock.calls[0][0] as string;
      expect(output).toContain('"userId":123');
      expect(output).toContain('"action":"test"');
    });

    it('无 meta 时不应包含额外 JSON', () => {
      setLogLevel('debug');
      const spy = jest.spyOn(console, 'info').mockImplementation();
      logger.info('纯消息');
      const output = spy.mock.calls[0][0] as string;
      expect(output).not.toContain('{');
    });
  });

  describe('环境变量', () => {
    it('LOG_LEVEL=debug 应初始化为 debug 级别', () => {
      process.env.LOG_LEVEL = 'debug';
      jest.resetModules();
      const { logger: logger2, getLogLevel: getLevel2 } = require('../src/utils/logger');
      expect(getLevel2()).toBe('debug');
    });

    it('无效 LOG_LEVEL 应回退到 info', () => {
      process.env.LOG_LEVEL = 'invalid_level';
      jest.resetModules();
      const { getLogLevel: getLevel2 } = require('../src/utils/logger');
      expect(getLevel2()).toBe('info');
    });
  });
});
