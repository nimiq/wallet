import { Ref, ref } from 'vue';
import router, { Columns } from '../router';

export enum ColumnType {
    ADDRESS = 'column-address',
    ACCOUNT = 'column-account',
    SIDEBAR = 'column-sidebar',
}

// FIXME: In Vue 2, composition-api methods cannot be used before the plugin is activated.
//        When switching to Vue 3, the activeMobileColumn variable can be directly instantiated
//        as ref.
let activeMobileColumn: Ref<ColumnType> | null = null;

// Adding this code at the end of the call stack so router is not undefined
setTimeout(() => {
    router.beforeResolve((to, from, next) => {
        if (!activeMobileColumn) {
            activeMobileColumn = ref(ColumnType.ACCOUNT);
        }

        const { meta, path, query: newQuery } = to;
        const { query: oldQuery } = from;

        if (newQuery && newQuery.sidebar) {
            activeMobileColumn.value = ColumnType.SIDEBAR;
        } else if (oldQuery && oldQuery.sidebar) {
            activeMobileColumn.value = ColumnType.ACCOUNT;
        } else if (meta) {
            switch (meta.column) {
                case Columns.DYNAMIC:
                    switch (path) {
                        case '/': activeMobileColumn.value = ColumnType.ACCOUNT; break;
                        case '/transactions': activeMobileColumn.value = ColumnType.ADDRESS; break;
                        default: break; // Don't change column
                    }
                    break;
                case Columns.ACCOUNT: activeMobileColumn.value = ColumnType.ACCOUNT; break;
                case Columns.ADDRESS: activeMobileColumn.value = ColumnType.ADDRESS; break;
                default: break;
            }
        }

        next();
    });
}, 0);

export function useActiveMobileColumn() {
    if (!activeMobileColumn) {
        activeMobileColumn = ref(ColumnType.ACCOUNT);
    }

    return {
        activeMobileColumn,
    };
}
