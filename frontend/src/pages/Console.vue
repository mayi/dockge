<template>
    <transition name="slide-fade" appear>
        <div v-if="!processing">
            <h1 class="mb-3">{{ $t("console") }}</h1>

            <div v-if="enableConsole" class="mb-3">
                <router-link to="/" class="btn btn-normal">
                    <font-awesome-icon icon="times" class="me-1" /> {{ $t("close") }}
                </router-link>
            </div>

            <Terminal v-if="enableConsole" class="terminal" :rows="20" mode="mainTerminal" name="console" :endpoint="endpoint"></Terminal>

            <div v-else class="alert alert-warning shadow-box" role="alert">
                <h4 class="alert-heading">{{ $t("Console is not enabled") }}</h4>
                <p v-html="$t('ConsoleNotEnabledMSG1')"></p>
                <p v-html="$t('ConsoleNotEnabledMSG2')"></p>
                <p v-html="$t('ConsoleNotEnabledMSG3')"></p>
            </div>
        </div>
    </transition>
</template>

<script>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

export default {
    components: {
        FontAwesomeIcon,
    },
    data() {
        return {
            processing: true,
            enableConsole: false,
        };
    },
    computed: {
        endpoint() {
            return this.$route.params.endpoint || "";
        },
    },
    mounted() {
        this.$root.emitAgent(this.endpoint, "checkMainTerminal", (res) => {
            this.enableConsole = res.ok;
            this.processing = false;
        });
    },
    methods: {
        
    }
};
</script>

<style scoped lang="scss">
.terminal {
    height: 410px;
}
</style>
