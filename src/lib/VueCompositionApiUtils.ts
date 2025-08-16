import Vue from 'vue';
import { set, nonReactive, VueWatcher } from '@vue/composition-api';

const KEY_OBSERVABLE = '__ob__'; // the key that is used by Vue's reactivity system for an object's Observer
// Hack for accessing Vue's internal class Dep, which is needed for disabling tracking access of reactive data in a
// watcher or computed composable.
const Dep: { target?: VueWatcher } = (new Vue()).$data[KEY_OBSERVABLE].dep.constructor;

export const enum MissingPropertyDeletionStrategy {
    DELETE,
    PRESERVE,
    PRESERVE_ON_ROOT,
}

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
     * limitations of Vue 2's reactivity system, see https://v2.vuejs.org/v2/guide/reactivity.html. Different to Vue.set
     * and @vue/composition-api's set, this version also makes already existing properties reactive, if they are not
     * reactive yet, and ensures firing change notifications also on those. This is particularly important for stores,
     * where non-reactive entries might have been created via store.patch. Notifications are fired for an individual
     * property that has been changed, or for the entire target object when a property is added, e.g. to notify usages
     * of Object.keys, Object.entries and the like.
     *
     * TODO once we stop using store.patch (or maybe also when updating pinia), or update to Vue 3, this method will not
     *  be required anymore.
     */
    static set<T extends Record<string, unknown>, K extends keyof T>(target: T, key: K, value: T[K]): T[K] {
        const propertyDescriptor = Object.getOwnPropertyDescriptor(target, key);
        if (propertyDescriptor) {
            // Property already exists.
            if (propertyDescriptor.set) {
                // Property already has a setter. We _assume_ that's already the setter for Vue 2's reactivity system,
                // and save us the overhead of calling @vue/composition-api's set with its additional checks, and also
                // avoid firing change notifications, if the value didn't change, based on the === check in Vue's
                // defineReactive.
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

    /**
     * Update a property in place, while triggering as few change notifications as possible. See updateObject.
     */
    static update<T extends Record<string, unknown>, K extends keyof T>(target: T, key: K, value: T[K]): void {
        VueCompositionApiUtils.updateObject(
            target,
            { [key]: value } as T as Partial<T>,
            MissingPropertyDeletionStrategy.PRESERVE_ON_ROOT,
        );
    }

    /**
     * Update object target in place, such that it matches object source (depending on missingPropertyDeletionStrategy),
     * while triggering as few change notifications as possible. For example, if source is equal to target, no change
     * notifications are triggered, including if source is not the same object as target (no strict equality), but has
     * the same properties and same values. If only the values of some properties of target or of a child object change,
     * only notifications for those properties are triggered. If a property is added or removed to target or a child
     * object, unfortunately, a change notification on that property's parent still has to be triggered, as opposed to
     * just on the property.
     *
     * One thing to consider is that while this method minimizes the change notifications, and thus can improve the
     * performance by avoiding running unnecessary watchers and computed composables, obviously recursing the objects
     * in this method also has a performance impact, but more importantly even, if the source object contains a lot of
     * changes, they are all processed by Vue, and even though dependent watchers are being called only once, this
     * processing has a high performance impact in itself, too. Thus, if you are expecting a lot of changes, for example
     * when initializing the stores from persisted data, it is better to use set instead of update/updateObject.
     */
    static updateObject<T extends Record<string, unknown>>(
        target: T,
        source: Partial<T>,
        missingPropertyDeletionStrategy: MissingPropertyDeletionStrategy = MissingPropertyDeletionStrategy.DELETE,
    ): void {
        let keysToDelete: Set<keyof T> | undefined;
        if (missingPropertyDeletionStrategy === MissingPropertyDeletionStrategy.DELETE) {
            keysToDelete = new Set(Object.keys(target) as Array<keyof T>);
            keysToDelete.delete(KEY_OBSERVABLE); // preserve the target's observable
        } else if (missingPropertyDeletionStrategy === MissingPropertyDeletionStrategy.PRESERVE_ON_ROOT) {
            // Change missingPropertyDeletionStrategy for recursive calls on child objects.
            missingPropertyDeletionStrategy = MissingPropertyDeletionStrategy.DELETE;
        }

        // Hide a potential current watcher in Dep.target, to avoid registering the data accesses we're making here as a
        // dependency for that watcher. This doesn't interfere with correctly notifying prior registered dependencies.
        const currentWatcher = Dep.target;
        Dep.target = undefined;
        try {
            for (const key of Object.keys(source) as Array<keyof T>) {
                keysToDelete?.delete(key);
                if (key === KEY_OBSERVABLE) continue; // preserve the target's observable

                if (!(key in target)) {
                    // Property does not exist on target yet. Define it. A change notification will be triggered by set
                    // on the parent object, target, because a new property is being added. No need for the additional
                    // handling of VueCompositionApiUtils.set here, as we already checked that the property doesn't
                    // exist on the target yet.
                    set(target, key, source[key]);
                    continue;
                }

                // If source[key] or target[key] isn't an object, target[key] can just be replaced with source[key].
                // The setter of Vue's defineReactive will trigger a change notification on the property if the value
                // did in fact change, based on a === check.
                // Start with checking source[key], because it's likely that source might just be a plain object without
                // reactive getters, i.e. accessing it is cheaper than accessing target[key], which likely is reactive.
                // The access of source[key] and target[key] is why we hid the current watcher on Dep.target.
                const newValue = source[key]; // cache value, in case it involves calling a getter
                if (typeof newValue !== 'object' || newValue === null) {
                    VueCompositionApiUtils.set(target, key, newValue);
                    continue;
                }
                const oldValue = target[key]; // cache value, in case it involves calling a getter
                if (typeof oldValue !== 'object' || oldValue === null) {
                    VueCompositionApiUtils.set(target, key, newValue);
                    continue;
                }

                // Both, target[key] and source[key] are objects. Don't replace target[key], but instead recurse to
                // trigger as little change notifications as possible, only for child properties that actually changed.
                VueCompositionApiUtils.updateObject(
                    oldValue as Record<string, unknown>,
                    newValue as Record<string, unknown>,
                    missingPropertyDeletionStrategy,
                );
            }
        } finally {
            Dep.target = currentWatcher; // restore tracking of dependencies on the current watcher
        }

        if (keysToDelete) {
            for (const key of keysToDelete) {
                // Delete removed properties. This will cause a change notification on the parent object, target.
                VueCompositionApiUtils.delete(target, key);
            }
        }
    }

    /**
     * Delete a property and fire change notifications. Using this method is required to circumvent the limitations of
     * Vue 2's reactivity system, see https://v2.vuejs.org/v2/guide/reactivity.html. Because @vue/composition-api does
     * not provide a delete method, we provide it here as counterpart to set. Even though we're simply using Vue.delete
     * here, it seems to be playing well with @vue/composition-api and set. Deleting a property via this method triggers
     * change notifications on the target object, which ensures that usages of APIs like Object.keys and Object.entries
     * get correctly notified of the change.
     *
     * TODO once removing the set method, this one can go too. Use Vue.delete in Vue 2.7, or plain js delete in Vue 3.
     */
    static delete<T extends Record<string, unknown>, K extends keyof T>(target: T, key: K) {
        Vue.delete(target as object, key as string);
    }
}

// Analysis: different to what I initially suspected from observations in the actual stores of the Wallet, the set from
// @vue/composition-api / Vue.set do in fact work correctly for notifying observers on value changes, and also observers
// that use APIs like Object.keys or Object.values when a new property is defined. This works both in plain composables
// created with reactive or ref, and also in states of pinia stores. For these cases, set from @vue/composition-api and
// Vue.set work just as well as the VueCompositionApiUtils.
// What does in fact not work, and what caused the reactivity issues observed in the Wallet, when not reassigning entire
// objects when adding a property to enforce a reactive change of the complete object, is: if a property is defined on
// the store for the first time by store.patch as opposed to by set or being defined on the initial state, no reactivity
// is setup, and also later calls of set on that property will not setup any reactivity anymore. Those issues are fixed
// by using our VueCompositionApiUtils by them enforcing reactivity by deleting the existing property, even if it was
// already defined by store.patch, however the better way would be to avoid store.patch altogether. Currently, in the
// Wallet, all stores are affected, as they all are restored from their persisted state via store.patch, and thus, we
// currently always have to do the hack of reassigning entire objects, with the following performance implications:
// - running all reactivity getters to copy the old object
// - setting up the reactivity handlers again on the new object
// - triggering all watchers and computed composables that use the changed object, even if the actually changed or added
//   property does not affect them.
// Using set to set a property, instead of replacing the entire parent object avoids these performance hits entirely if
// writing an existing property, and all but the third one when adding or removing a property. If a new property is
// added or removed, set or delete trigger a notification on the parent element, and not just on the property, which
// ensures APIs like Object.keys on the object are also re-evaluated correctly, but also lead to watchers and computed
// composables being unnecessarily triggered, which use the object, but maybe just a property on that object unrelated
// to the added/removed property. In that case, set is thus not so different from assigning a new object, but still has
// the other advantages, and clear benefit when setting an already existing property.
// To reduce the impact of unnecessarily triggered watchers and computed composables, watchers with a watcher source
// that explicitly lists the actual dependencies and triggers the watcher callback only on actual changes can be used,
// instead of effect watchers or computed composables. Additionally, repeated watcher invocations could be debounced.
// TODO get rid of store.patch!! Then change the store actions to only set/add the properties that are actually
//  changing, instead of replacing the entire object. The VueCompositionApiUtils should also then not mostly not
//  be needed anymore.
// // @ts-expect-error assigning a method on window for testing purposes
// window.testVueCompositionApiUtils = async function testVueCompositionApiPluginUtils() {
//     const STANDARD_REACTIVITY_SET_HANDLER_TO_TEST: 'composition-api' | 'vue' = 'composition-api';
//     const [
//         { reactive, watch },
//         { createStore },
//     ] = await Promise.all([
//         import('@vue/composition-api'),
//         import('pinia'),
//     ]);
//     const standardSetHandler = STANDARD_REACTIVITY_SET_HANDLER_TO_TEST === 'vue' ? Vue.set.bind(Vue) : set;
//
//     // Setup state
//     console.log('Experiment: Setup initial state and store'); // eslint-disable-line no-console
//     const experiments = [
//         'withNoReactivityHandling', // assigning properties directly on the state
//         'withStandardReactivityHandling', // using standardSetHandler
//         'withCustomReactivityHandling', // using our VueCompositionApiUtils
//     ] as const;
//     type Experiment = (typeof experiments)[number];
//     const properties = [
//         'preDefinedProperty', // a property pre-defined on the state
//         'dynamicallyAddedProperty', // a property that will be dynamically added to the state
//     ] as const;
//     type Property = (typeof properties)[number];
//     const createInitialState = () => experiments.reduce((result, experiment) => ({
//         ...result,
//         [experiment]: { preDefinedProperty: 0 }, // preDefinedProperty + dynamicallyAddedProperty on each experiment
//     }), {} as Record<
//         Experiment,
//         { preDefinedProperty: number, dynamicallyAddedProperty?: number, patchedProperty?: number }
//     >);
//     const state = reactive(createInitialState());
//     const useStore = createStore({
//         id: 'reactivity-experiment',
//         state: () => createInitialState(),
//         getters: experiments.reduce((getters, experiment) => ({
//             ...getters,
//             [`keys_${experiment}`]: (storeState: any) => Object.keys(storeState[experiment]),
//         }), {} as Record<`keys_${Experiment}`, (storeState: any) => string[]>),
//         actions: {
//             set_withNoReactivityHandling(property: Property | 'patchedProperty', value: number) {
//                 this.state.withNoReactivityHandling[property] = value;
//             },
//             set_withStandardReactivityHandling(property: Property | 'patchedProperty', value: number) {
//                 standardSetHandler(this.state.withStandardReactivityHandling, property, value);
//             },
//             set_withCustomReactivityHandling(property: Property | 'patchedProperty', value: number) {
//                 VueCompositionApiUtils.set(this.state.withCustomReactivityHandling, property, value);
//             },
//         },
//     });
//     const store = useStore();
//
//     // Setup watchers
//     // Note: ideally only uncomment the watchers you are currently interested in, as they might potentially impact
//     // reactivity (although it doesn't seem to be the case actually).
//     for (const experiment of experiments) {
//         for (const property of properties) {
//             // For a watcher with a reactive watcher source and a watcher callback, the watcher source is
//             // triggered on reactive changes (e.g. if state[experiment] is notified of a change), but the
//             // callback is only triggered if the result of the watcher source changes (e.g. the result of
//             // () => state[experiment][property]). Thus, if a callback is expensive, it is better to use
//             // this format of a watcher with a source and callback over an effect watcher or computed composable.
//             watch(
//                 () => state[experiment][property],
//                 // eslint-disable-next-line no-console
//                 (value) => console.log(`Experiment: Watcher triggered for state[${experiment}][${property}] `
//                     + `with value ${value}`),
//             );
//             // A watcher with a simple effect is triggered just like the watcher source above on any reactive
//             // changes, and does re-run entirely for any of such changes, and is thus not a favorable choice for
//             // expensive callbacks.
//             watch(() => {
//                 // eslint-disable-next-line no-console
//                 console.log(`Experiment: effect watcher for state[${experiment}][${property}] `
//                     + `with value ${state[experiment][property]}`);
//             });
//         }
//         watch(
//             () => Object.keys(state[experiment]),
//             // eslint-disable-next-line no-console
//             (value) => console.log(`Experiment: Watcher triggered for Object.keys(state[${experiment}]) `
//                 + `with value [${value.join(', ')}]`),
//         );
//         watch(() => {
//             // eslint-disable-next-line no-console
//             console.log(`Experiment: effect watcher for Object.keys(state[${experiment}]) `
//                 + `with value [${Object.keys(state[experiment]).join(', ')}]`);
//         });
//         watch(() => {
//             // eslint-disable-next-line no-console
//             console.log(`Experiment: store getter effect watcher for keys_${experiment} `
//                 + `with value [${store[`keys_${experiment}`].value.join(', ')}]`);
//         });
//     }
//     await Vue.nextTick();
//
//     // Modify state to see which watchers trigger
//     console.log('----------------------\nExperiment: Test plain reactive'); // eslint-disable-line no-console
//     console.log('Experiment: Modifying preDefinedProperty to value 1'); // eslint-disable-line no-console
//     state.withNoReactivityHandling.preDefinedProperty = 1;
//     standardSetHandler(state.withStandardReactivityHandling, 'preDefinedProperty', 1);
//     VueCompositionApiUtils.set(state.withCustomReactivityHandling, 'preDefinedProperty', 1);
//     await Vue.nextTick();
//     console.log('Experiment: Adding dynamicallyAddedProperty with value 0'); // eslint-disable-line no-console
//     state.withNoReactivityHandling.dynamicallyAddedProperty = 0;
//     standardSetHandler(state.withStandardReactivityHandling, 'dynamicallyAddedProperty', 0);
//     VueCompositionApiUtils.set(state.withCustomReactivityHandling, 'dynamicallyAddedProperty', 0);
//     await Vue.nextTick();
//     console.log('Experiment: Modifying dynamicallyAddedProperty to value 1'); // eslint-disable-line no-console
//     state.withNoReactivityHandling.dynamicallyAddedProperty = 1;
//     standardSetHandler(state.withStandardReactivityHandling, 'dynamicallyAddedProperty', 1);
//     VueCompositionApiUtils.set(state.withCustomReactivityHandling, 'dynamicallyAddedProperty', 1);
//     await Vue.nextTick();
//     console.log('Experiment: Removing dynamicallyAddedProperty'); // eslint-disable-line no-console
//     delete state.withNoReactivityHandling.dynamicallyAddedProperty;
//     Vue.delete(state.withStandardReactivityHandling, 'dynamicallyAddedProperty');
//     VueCompositionApiUtils.delete(state.withCustomReactivityHandling, 'dynamicallyAddedProperty');
//     await Vue.nextTick();
//
//     console.log('----------------------\nExperiment: Test store'); // eslint-disable-line no-console
//     console.log('Experiment: Modifying preDefinedProperty to value 1'); // eslint-disable-line no-console
//     store.set_withNoReactivityHandling('preDefinedProperty', 1);
//     store.set_withStandardReactivityHandling('preDefinedProperty', 1);
//     store.set_withCustomReactivityHandling('preDefinedProperty', 1);
//     await Vue.nextTick();
//     console.log('Experiment: Adding dynamicallyAddedProperty with value 0'); // eslint-disable-line no-console
//     store.set_withNoReactivityHandling('dynamicallyAddedProperty', 0);
//     store.set_withStandardReactivityHandling('dynamicallyAddedProperty', 0);
//     store.set_withCustomReactivityHandling('dynamicallyAddedProperty', 0);
//     await Vue.nextTick();
//     console.log('Experiment: Modyfying dynamicallyAddedProperty to value 1'); // eslint-disable-line no-console
//     store.set_withNoReactivityHandling('dynamicallyAddedProperty', 1);
//     store.set_withStandardReactivityHandling('dynamicallyAddedProperty', 1);
//     store.set_withCustomReactivityHandling('dynamicallyAddedProperty', 1);
//     await Vue.nextTick();
//     console.log('Experiment: Removing dynamicallyAddedProperty'); // eslint-disable-line no-console
//     delete store.state.withNoReactivityHandling.dynamicallyAddedProperty;
//     Vue.delete(store.state.withStandardReactivityHandling, 'dynamicallyAddedProperty');
//     VueCompositionApiUtils.delete(store.state.withCustomReactivityHandling, 'dynamicallyAddedProperty');
//     await Vue.nextTick();
//
//     console.log('----------------------\nExperiment: Test store patch'); // eslint-disable-line no-console
//     console.log('Experiment: Adding patchedProperty via store.patch'); // eslint-disable-line no-console
//     store.patch({
//         withNoReactivityHandling: { patchedProperty: 0 },
//         withStandardReactivityHandling: { patchedProperty: 0 },
//         withCustomReactivityHandling: { patchedProperty: 0 },
//     });
//     await Vue.nextTick();
//     console.log('Experiment: Modifying patchedProperty to value 1'); // eslint-disable-line no-console
//     store.set_withNoReactivityHandling('patchedProperty', 1);
//     store.set_withStandardReactivityHandling('patchedProperty', 1);
//     store.set_withCustomReactivityHandling('patchedProperty', 1);
// };
