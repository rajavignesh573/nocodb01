import { loadLocaleMessages, setI18nLanguage } from '~/plugins/a.i18n'

/**
 * Initialize global state and watches for changes
 *
 * @example
 * ```js
 *
 *
 * const { $state } = useNuxtApp()
 *
 * console.log($state.lang.value) // 'en'
 * ```
 */
const statePlugin = async (nuxtApp: any) => {
  const state = useGlobal()

  let currentLang = state.lang.value

  /** fall back to EN language if the current language cannot be found in Language or LanguagesAlias */
  if (![...Object.keys(Language), ...Object.keys(LanguageAlias)].includes(currentLang)) state.lang.value = currentLang = 'en'

  /** force load initial locale messages */
  await Promise.all([loadLocaleMessages(currentLang), loadLocaleMessages('en')])

  /** set i18n locale to stored language */
  await setI18nLanguage(currentLang)

  try {
    state.appInfo.value = (await nuxtApp.$api.utils.utilsAppInfo()) as AppInfo
  } catch (e) {
    console.error(e)
  }
}

export default defineNuxtPlugin(async function (nuxtApp) {
  if (!isEeUI) return await statePlugin(nuxtApp)
})

export { statePlugin }
