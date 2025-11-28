/**
 * Page model - Represents a monitored webpage
 */

import { Storage, HtmlStorage } from './storage.js';

export const PageState = {
  NO_CHANGE: 'no_change',
  CHANGED: 'changed',
  ERROR: 'error'
};

const DEFAULTS = {
  title: 'New Page',
  url: '',
  scanIntervalMinutes: 60,
  changeThreshold: 100,
  state: PageState.NO_CHANGE,
  lastScanTime: null,
  lastChangeTime: null,
  errorMessage: null
};

/**
 * Page class
 */
export class Page {
  constructor(id, data = {}) {
    this.id = id;
    this.title = data.title ?? DEFAULTS.title;
    this.url = data.url ?? DEFAULTS.url;
    this.scanIntervalMinutes = data.scanIntervalMinutes ?? DEFAULTS.scanIntervalMinutes;
    this.changeThreshold = data.changeThreshold ?? DEFAULTS.changeThreshold;
    this.state = data.state ?? DEFAULTS.state;
    this.lastScanTime = data.lastScanTime ?? DEFAULTS.lastScanTime;
    this.lastChangeTime = data.lastChangeTime ?? DEFAULTS.lastChangeTime;
    this.errorMessage = data.errorMessage ?? DEFAULTS.errorMessage;
  }

  static key(id) {
    return `page:${id}`;
  }

  static async load(id) {
    const data = await Storage.get(Page.key(id));
    return data ? new Page(id, data) : null;
  }

  async save() {
    await Storage.set(Page.key(this.id), this.toJSON());
    return this;
  }

  async delete() {
    await Storage.remove(Page.key(this.id));
    await HtmlStorage.remove(`html:${this.id}:old`);
    await HtmlStorage.remove(`html:${this.id}:new`);
  }

  toJSON() {
    return {
      title: this.title,
      url: this.url,
      scanIntervalMinutes: this.scanIntervalMinutes,
      changeThreshold: this.changeThreshold,
      state: this.state,
      lastScanTime: this.lastScanTime,
      lastChangeTime: this.lastChangeTime,
      errorMessage: this.errorMessage
    };
  }

  isChanged() {
    return this.state === PageState.CHANGED;
  }

  isError() {
    return this.state === PageState.ERROR;
  }

  needsScan() {
    if (this.scanIntervalMinutes === 0) return false;
    if (!this.lastScanTime) return true;
    const elapsed = Date.now() - this.lastScanTime;
    return elapsed >= this.scanIntervalMinutes * 60 * 1000;
  }
}

/**
 * PageStore - Manages all pages
 */
export class PageStore {
  constructor() {
    this.pages = new Map();
  }

  static async load() {
    const store = new PageStore();
    const all = await Storage.getAll();
    
    for (const [key, data] of Object.entries(all)) {
      if (key.startsWith('page:')) {
        const id = key.slice(5);
        store.pages.set(id, new Page(id, data));
      }
    }
    
    return store;
  }

  getAll() {
    return Array.from(this.pages.values());
  }

  get(id) {
    return this.pages.get(id);
  }

  getChanged() {
    return this.getAll().filter(p => p.isChanged());
  }

  getNeedingScan() {
    return this.getAll().filter(p => p.needsScan());
  }

  async create(data) {
    const id = crypto.randomUUID();
    const page = new Page(id, data);
    await page.save();
    this.pages.set(id, page);
    return page;
  }

  async update(id, updates) {
    const page = this.pages.get(id);
    if (!page) return null;
    
    Object.assign(page, updates);
    await page.save();
    return page;
  }

  async delete(id) {
    const page = this.pages.get(id);
    if (page) {
      await page.delete();
      this.pages.delete(id);
    }
  }

  async markAsRead(id) {
    return this.update(id, { state: PageState.NO_CHANGE });
  }
}

/**
 * HTML storage helpers
 */
export const PageHtml = {
  async saveNew(pageId, html) {
    await HtmlStorage.save(`html:${pageId}:new`, html);
  },

  async saveOld(pageId, html) {
    await HtmlStorage.save(`html:${pageId}:old`, html);
  },

  async loadNew(pageId) {
    return HtmlStorage.load(`html:${pageId}:new`);
  },

  async loadOld(pageId) {
    return HtmlStorage.load(`html:${pageId}:old`);
  }
};
