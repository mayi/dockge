<template>
    <div>
        <div class="my-4">
            <label for="language" class="form-label">
                {{ $t("Language") }}
            </label>
            <select id="language" v-model="$root.language" class="form-select">
                <option
                    v-for="(lang, i) in $i18n.availableLocales"
                    :key="`Lang${i}`"
                    :value="lang"
                >
                    {{ $i18n.messages[lang].languageName }}
                </option>
            </select>
        </div>
        <div v-show="true" class="my-4">
            <label for="timezone" class="form-label">{{ $t("Theme") }}</label>
            <div>
                <div
                    class="btn-group"
                    role="group"
                    aria-label="Basic checkbox toggle button group"
                >
                    <input
                        id="btncheck1"
                        v-model="$root.userTheme"
                        type="radio"
                        class="btn-check"
                        name="theme"
                        autocomplete="off"
                        value="light"
                    />
                    <label class="btn btn-outline-primary" for="btncheck1">
                        {{ $t("Light") }}
                    </label>

                    <input
                        id="btncheck2"
                        v-model="$root.userTheme"
                        type="radio"
                        class="btn-check"
                        name="theme"
                        autocomplete="off"
                        value="dark"
                    />
                    <label class="btn btn-outline-primary" for="btncheck2">
                        {{ $t("Dark") }}
                    </label>

                    <input
                        id="btncheck3"
                        v-model="$root.userTheme"
                        type="radio"
                        class="btn-check"
                        name="theme"
                        autocomplete="off"
                        value="auto"
                    />
                    <label class="btn btn-outline-primary" for="btncheck3">
                        {{ $t("Auto") }}
                    </label>
                </div>
            </div>
        </div>

        <!-- Image Tag Split Setting -->
        <div class="my-4">
            <label class="form-label">{{ $t("dockerImage") }}</label>
            <div class="form-check form-switch">
                <input
                    id="imageTagSplit"
                    v-model="imageTagSplit"
                    class="form-check-input"
                    type="checkbox"
                />
                <label class="form-check-label" for="imageTagSplit">
                    {{ $t("imageVersionSplit") }}
                </label>
            </div>
            <div class="form-text">
                <div class="image-split-preview mt-2">
                    <div v-if="!imageTagSplit" class="preview-combined">
                        <span class="badge bg-secondary">nginx:latest</span>
                    </div>
                    <div v-else class="preview-split">
                        <span class="badge bg-secondary me-1">nginx</span>
                        <span class="badge bg-primary">latest</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    data() {
        return {
            imageTagSplit: localStorage.getItem("imageTagSplit") === "true",
        };
    },
    watch: {
        imageTagSplit(val) {
            localStorage.setItem("imageTagSplit", val ? "true" : "false");
        },
    },
};
</script>

<style lang="scss" scoped>
@import "../../styles/vars.scss";

.btn-check:active + .btn-outline-primary,
.btn-check:checked + .btn-outline-primary,
.btn-check:hover + .btn-outline-primary {
    color: #fff;

    .dark & {
        color: #000;
    }
}

.dark {
    .list-group-item {
        background-color: $dark-bg2;
        color: $dark-font-color;
    }
}
</style>
