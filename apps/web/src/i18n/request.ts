import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

/**
 * Message namespaces add here to be used in the request config
 */
export enum MessageNamespace {
  AUTH = 'auth',
  COMMON = 'common',
}

/**
 * Configuration for next-intl message loading and locale handling
 *
 * This function:
 * 1. Validates the requested locale against supported locales
 * 2. Loads message files for each namespace in parallel
 * 3. Merges all namespace messages into a single messages object
 *
 * @param {Object} params - Configuration parameters
 * @param {Promise<string>} params.requestLocale - The requested locale from the client
 * @returns {Promise<{locale: string, messages: Object}>} The locale and merged messages
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const messagePromises = Object.values(MessageNamespace).map((namespace) =>
    import(`@messages/${namespace}/${locale}.json`).then((module) => ({
      namespace,
      messages: module.default,
    })),
  );
  const messageModules = await Promise.all(messagePromises);

  const messages = messageModules.reduce(
    (acc, { messages }) => ({
      ...acc,
      ...messages,
    }),
    {},
  );

  return {
    locale,
    messages,
  };
});
