<template>
    <div class="contact-book flex-column" :class="{ editing }">
        <div ref="list$" class="list flex-column">
            <div class="scroll-mask top"></div>
            <button
                v-for="addressInfo in (showAllOwnAddresses ? ownAddressInfos : ownAddressInfos.slice(0, 2))"
                :key="addressInfo.address"
                class="reset contact-button flex-row"
                @click="$emit('contact-selected', addressInfo, RecipientType.OWN_ADDRESS)"
                :tabindex="0"
            >
                <Avatar :label="addressInfo.label"/>
                <label>{{ addressInfo.label }}</label>
                <div class="flex-grow"></div>
                <InteractiveShortAddress :address="addressInfo.address" tooltipPosition="top right"
                    :tooltipContainer="list$ ? { $el: list$ } : null" :offsetTooltipPosition="false"/>
            </button>
            <button v-if="ownAddressInfos.length > 2 && !showAllOwnAddresses"
                class="nq-button-s show-own-addresses-button"
                @click="showAllOwnAddresses = true" @mousedown.prevent>
                {{ $t('Show all my addresses') }}
            </button>
            <div v-if="ownAddressInfos.length" class="separator"></div>
            <button
                v-for="contact in contacts"
                :key="contact.address"
                class="reset contact-button flex-row"
                @click="!editing && $emit('contact-selected', contact, RecipientType.CONTACT)"
                :tabindex="editing ? -1 : 0"
            >
                <Avatar :label="contact.label"/>
                <label v-if="!editing">{{ contact.label }}</label>
                <LabelInput v-else
                    :value="contact.label"
                    :placeholder="$t('Name your contact')"
                    @input="onInput(contact.address, $event)"/>
                <div class="flex-grow"></div>
                <InteractiveShortAddress :address="contact.address" tooltipPosition="top right"
                    :tooltipContainer="list$ ? { $el: list$ } : null" :offsetTooltipPosition="false"/>
                <button v-if="editing" class="reset delete-button" @click="setContact(contact.address, '')">
                    <TrashIcon/>
                </button>
            </button>
            <div class="scroll-mask bottom"></div>
        </div>
        <template v-if="contacts.length">
            <button v-if="!editing"
                class="nq-button-s edit-button"
                @click="editing = true" @mousedown.prevent key="edit"
            >
                {{ $t('Edit contacts') }}
            </button>
            <button v-else
                class="nq-button-pill light-blue edit-button"
                @click="editing = false" @mousedown.prevent key="done"
            >
                {{ $t('Done') }}
            </button>
        </template>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from 'vue';
import { LabelInput } from '@nimiq/vue-components';
import { CryptoCurrency } from '@nimiq/utils';
import Avatar from './Avatar.vue';
import InteractiveShortAddress from './InteractiveShortAddress.vue';
import TrashIcon from './icons/TrashIcon.vue';
import { RecipientType } from './modals/StablecoinSendModal.vue';
import { useUsdcContactsStore } from '../stores/UsdcContacts';
import { useUsdtContactsStore } from '../stores/UsdtContacts';
import { PolygonAddressInfo, usePolygonAddressStore } from '../stores/PolygonAddress';
import { useAccountStore } from '../stores/Account';
import { useAccountSettingsStore } from '../stores/AccountSettings';

export default defineComponent({
    setup() {
        const { stablecoin } = useAccountSettingsStore();
        const { contactsArray: contacts, setContact } = stablecoin.value === CryptoCurrency.USDC
            ? useUsdcContactsStore()
            : useUsdtContactsStore();

        const { state: $polygonAddresses, addressInfo: activeAddressInfo } = usePolygonAddressStore();

        type LabeledPolygonAddressInfo = PolygonAddressInfo & {
            label: string,
        };

        const { accountInfos } = useAccountStore();

        const list$ = ref<HTMLDivElement>(null);

        const ownAddressInfos = computed(() => Object.values($polygonAddresses.addressInfos)
            .filter((addressInfo) => addressInfo.address !== activeAddressInfo.value?.address)
            .map((addressInfo) => ({
                ...addressInfo,
                label: Object.values(accountInfos.value).find((accountInfo) =>
                    accountInfo.polygonAddresses?.includes(addressInfo.address))!.label,
            } as LabeledPolygonAddressInfo)),
        );

        const showAllOwnAddresses = ref(false);

        const editing = ref(false);

        function onInput(address: string, label: string) {
            // Don't delete contacts when label is cleared, as that would remove it from the list
            if (!label) return;

            setContact(address, label);
        }

        return {
            list$,
            contacts,
            ownAddressInfos,
            showAllOwnAddresses,
            RecipientType,
            editing,
            onInput,
            setContact,
        };
    },
    components: {
        Avatar,
        InteractiveShortAddress,
        LabelInput,
        TrashIcon,
    },
});
</script>

<style lang="scss" scoped>
@import '../scss/mixins.scss';

// TODO: Extract into SCSS mixin or global style
.scroll-mask {
    position: sticky;
    height: 3rem;
    flex-shrink: 0;
    z-index: 2;
    pointer-events: none;

    &.top {
        top: 0;
        background: linear-gradient(var(--bg-primary), rgba(255, 255, 255, 0));
        margin-bottom: -0.5rem;
    }

    &.bottom {
        bottom: 0;
        background: linear-gradient(0deg, var(--bg-primary), rgba(255, 255, 255, 0));
        margin-top: -0.5rem;
    }
}

.contact-book {
    max-height: 100%;
}

.list {
    overflow-y: auto;
    padding: 0 2rem;
    flex-grow: 1;

    @extend %custom-scrollbar;
}

.address-button,
.contact-button {
    width: 100%;

    transition: background 0.2s var(--nimiq-ease);
}

.address-button:hover,
.address-button:focus,
.contact-book:not(.editing) .contact-button:hover,
.contact-book:not(.editing) .contact-button:focus {
    background: var(--nimiq-highlight-bg);
}

.contact-book.editing .contact-button {
    cursor: auto;
}

.show-own-addresses-button {
    margin: 2rem auto 1rem;
}

.separator {
    height: 0.25rem;
    box-shadow: inset 0 1.5px var(--text-14);
    margin: 2rem 0;
    flex-shrink: 0;
}

.contact-button {
    align-items: center;
    padding: 2rem;
    border-radius: 0.75rem;

    .avatar {
        margin: -0.3125rem 0; // 0.3125 = 2.5px
        flex-shrink: 0;
    }

    label,
    .label-input {
        margin: 0 2rem;
        font-weight: 600;
    }

    .label-input {
        margin-left: 1.25rem;

        ::v-deep .width-finder {
            padding: 0 0.75rem;
        }

        ::v-deep input {
            padding: 0.625rem 0.75rem;
            padding-right: 0;
        }
    }

    .interactive-short-address {
        flex-shrink: 0;

        ::v-deep {
            .trigger {
                padding: 0;
            }

            .tooltip-box {
                margin-left: -1rem;
            }
        }
    }

    .delete-button {
        padding: 1rem;
        border-radius: 0.5rem;
        margin: 0 -1rem 0 1rem;
        flex-shrink: 0;

        transition:
            background 0.2s var(--nimiq-ease),
            color 0.2s var(--nimiq-ease);

        svg {
            opacity: 0.4;
            display: block;

            transition: opacity 0.2s var(--nimiq-ease);
        }

        &:hover,
        &:focus {
            color: var(--nimiq-red);
            background: rgba(216, 65, 51, 0.12); // Based on Nimiq Red

            svg {
                opacity: 1;
            }
        }
    }
}

.edit-button {
    align-self: center;
}

@media (max-width: $mobileBreakpoint) { // Full mobile breakpoint
    .contact-button {
        background: none !important;

        label,
        .label-input {
            margin: 0 1.5rem;
        }

        .label-input {
            margin-left: 0.75rem;
        }
    }
}
</style>
