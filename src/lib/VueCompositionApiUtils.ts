import { set, nonReactive } from '@vue/composition-api';

/**
 * A collection of utilities to make Vue's composition API more usable.
 *
 * TODO once we update to the native Composition API on Vue 2.7 or Vue 3, check if these utilities are still required,
 *  and make sure to make the ones still needed compatible with the native Composition API.
 */
export default class VueCompositionApiUtils {
    /**
     * Mark an object as non-reactive, to opt-out from reactive updates, and remove the overhead of Vue's reactivity
     * system. This can lead to significant performance improvements on large data collections of static data. Note that
     * the implementation in @vue/composition-api is only compatible with objects, not arrays.
     *
     * TODO on Vue 2.7 or Vue 3, markRaw or shallowRef should be used.
     */
    static nonReactive<T extends Record<string, unknown>>(object: T): T {
        return nonReactive(object);
    }

    /**
     * Set a property on an object and setup reactivity handling. Using this method is required to circumvent the
     * limitations of Vue 2's reactivity system, see https://v2.vuejs.org/v2/guide/reactivity.html.
     * Note that only new usages after setting up reactivity handling via this method receive this and future reactive
     * updates in computed composables, watchers, etc. Any prior access of the property does not register the property
     * as a dependency of the composable or watcher, as the reactivity handling taking care of that was not setup yet.
     * This is the case for both, direct access of the property in question, and indirect access via Object.entries()
     * and the like.
     * To circumvent this issue use getPropertyAndEnableReactiveUpdates() for access of the property. Object.entries()
     * etc. will work automatically by set notifying about a change for the target object, if the property did not exist
     * yet.
     *
     * TODO on Vue 2.7 use Vue.set instead, and on Vue 3 this method might not be needed at all. However, the caveats
     *  regarding reactivity of prior access might remain.
     */
    static set<T extends Record<string, unknown>, K extends keyof T>(target: T, key: K, value: T[K]): T[K] {
        const propertyDescriptor = Object.getOwnPropertyDescriptor(target, key);
        return VueCompositionApiUtils._setWithKnownPropertyDescriptor(target, key, value, propertyDescriptor);
    }

    /**
     * Get a property of an object and make sure future reactive updates are received, even if the property is not
     * reactive yet or does not even exist yet. If the property does not exist yet, it will be set to null. Therefore,
     * any code that accesses this property should make sure it handles null values.
     *
     * TODO check whether this method is still required with Vue 2.7 or Vue 3.
     */
    static getPropertyAndEnableReactiveUpdates<T extends Record<string, unknown | null>, K extends keyof T>(
        target: T,
        key: K,
    ): T[K] | null {
        const propertyDescriptor = Object.getOwnPropertyDescriptor(target, key);
        if (!propertyDescriptor || !propertyDescriptor.get) {
            // The getter for Vue 2's reactivity system is not setup yet, so we set the reactivity up first. If the
            // value does not exist yet, we set it to null. Note that setting undefined does not seem to be supported by
            // the reactivity system. Also note that if a getter is already defined, we just _assume_ that it's the
            // getter of Vue 2's reactivity system.
            const value = target[key] !== undefined ? target[key] : null;
            VueCompositionApiUtils._setWithKnownPropertyDescriptor(target, key, value as any, propertyDescriptor);
        }
        // Now that we made sure, that reactivity on the property is setup, it will be registered as reactive dependency
        // on access.
        return target[key];
    }

    /**
     * Delete a property and fire change notifications. We provide this method as @vue/composition-api does not. It's
     * not perfect though. A change notification is fired for the property and its value, but not on the target object
     * regarding the removal of the property. I.e. watchers and computed composables accessing the value, for example
     * via target[property] or Object.values(target) get notified about the change, not however those that only use for
     * example Object.keys(target).
     * To make Object.keys() work, we could consider a utility method for that, and track interested usages in a
     * WeakMap<object, Ref>, with the ref being updated in set and delete, if a property is added / removed, and
     * accessed in the Object.keys utility method to be notified on changes.
     *
     * TODO once not using @vue/composition-api anymore, use Vue.delete in Vue 2.7, or plain js delete in Vue 3.
     */
    static delete<T extends Record<string, unknown>, K extends keyof T>(target: T, key: K) {
        if (!(key in target)) return;
        set(target, key, undefined); // for change detection
        delete target[key]; // for also removing the key
    }

    private static _setWithKnownPropertyDescriptor<T extends Record<string, unknown>, K extends keyof T>(
        target: T,
        key: K,
        value: T[K],
        knownPropertyDescriptor: PropertyDescriptor | undefined,
    ): T[K] {
        if (knownPropertyDescriptor) {
            // Property already exists.
            if (knownPropertyDescriptor.set) {
                // Property already has a setter. We _assume_ that's already the setter for Vue 2's reactivity system,
                // and save us the overhead of calling @vue/composition-api's set with its additional checks.
                target[key] = value;
                return value;
            }
            // The property already exist, but no reactivity is setup. In this case, @vue/composition-api's set does not
            // setup the reactivity anymore. To avoid this and enforce setting up the reactivity, we delete the existing
            // property before calling set.
            delete target[key];
        }
        return set(target, key, value);
    }
}
