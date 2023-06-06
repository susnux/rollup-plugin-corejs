type ModuleName = string;

type Target =
  | 'android'
  | 'bun'
  | 'chrome'
  | 'chrome-android'
  | 'deno'
  | 'edge'
  | 'electron'
  | 'firefox'
  | 'firefox-android'
  | 'hermes'
  | 'ie'
  | 'ios'
  | 'node'
  | 'opera'
  | 'opera-android'
  | 'phantom'
  | 'quest'
  | 'react-native'
  | 'rhino'
  | 'safari'
  | 'samsung';

type TargetVersion = string;

type StringOrRegExp = string | RegExp;

type Modules = StringOrRegExp | readonly StringOrRegExp[];

type BrowserslistQuery = string | ReadonlyArray<string>;

type Environments = {
  [target in Target]?: string | number;
};

type Targets = Environments & {
  browsers?: Environments | BrowserslistQuery,
  esmodules?: boolean,
};

type CompatOptions = {
  /** entry / module / namespace / an array of them, by default - all `core-js` modules */
  modules?: Modules,
  /** a blacklist, entry / module / namespace / an array of them, by default - empty list */
  exclude?: Modules,
  /** optional browserslist or core-js-compat format query */
  targets?: Targets | BrowserslistQuery,
  /** used `core-js` version, by default the latest */
  version?: string,
  /** inverse of the result, shows modules that are NOT required for the target environment */
  inverse?: boolean,
  /**
   * @deprecated use `modules` instead
   */
  filter?: Modules
};

type CompatOutput = {
  /** array of required modules */
  list: ModuleName[],
  /** object with targets for each module */
  targets: {
    [module: ModuleName]: {
      [target in Target]?: TargetVersion
    }
  }
}

declare function compat(options?: CompatOptions): CompatOutput

declare module 'core-js-compat' {
  const ExportedCompatObject: typeof compat & {
    compat: typeof compat,
  
    /** map of modules by `core-js` entry points */
    entries: {[entry_point: string]: readonly ModuleName[]},
  
    /** Full list of modules */
    modules: readonly ModuleName[]
  }

  export = ExportedCompatObject
}
