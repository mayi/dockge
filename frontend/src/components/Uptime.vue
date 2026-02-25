<template>
    <span :class="className">{{ statusName }}</span>
</template>

<script>
import { statusColor, statusNameShort } from "../../../common/util-common";

export default {
    props: {
        stack: {
            type: Object,
            default: null,
        },
        fixedWidth: {
            type: Boolean,
            default: false,
        },
    },

    computed: {
        uptime() {
            return this.$t("notAvailableShort");
        },

        color() {
            return statusColor(this.stack?.status);
        },

        statusName() {
            return this.$t(statusNameShort(this.stack?.status));
        },

        className() {
            let className = `badge rounded-pill bg-${this.color}`;

            if (this.fixedWidth) {
                className += " fixed-width";
            }
            return className;
        },
    },
};
</script>

<style scoped>
.badge {
    min-width: 62px;
    font-weight: 600;
    font-size: 11px;
    letter-spacing: 0.3px;
    padding: 5px 10px;
}

.fixed-width {
    width: 62px;
    overflow: hidden;
    text-overflow: ellipsis;
}
</style>
