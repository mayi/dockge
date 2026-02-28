<template>
    <transition name="slide-fade" appear>
        <div>
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h1 class="mb-0">{{ $t("templates") }}</h1>
                <button class="btn btn-primary btn-sm" @click="openCreateModal">
                    <font-awesome-icon icon="plus" class="me-1" /> {{ $t("createTemplate") }}
                </button>
            </div>

            <div class="d-flex gap-2 mb-3">
                <input v-model="searchQuery" class="form-control form-control-sm" style="max-width: 300px;" type="text" :placeholder="$t('searchTemplates')" />
                <select v-model="categoryFilter" class="form-select form-select-sm" style="width: auto;">
                    <option value="">{{ $t("allCategories") }}</option>
                    <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
                </select>
            </div>

            <!-- Tabs -->
            <ul class="nav nav-tabs mb-3">
                <li class="nav-item">
                    <a class="nav-link" :class="{ active: tab === 'builtin' }" href="#" @click.prevent="tab = 'builtin'">
                        {{ $t("builtInTemplates") }}
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" :class="{ active: tab === 'custom' }" href="#" @click.prevent="tab = 'custom'">
                        {{ $t("myTemplates") }}
                    </a>
                </li>
            </ul>

            <div v-if="loading" class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>

            <div v-else-if="filteredTemplates.length === 0" class="text-center py-4 text-muted">
                {{ $t("noTemplates") }}
            </div>

            <div v-else class="row g-3">
                <div v-for="template in filteredTemplates" :key="template.id" class="col-12 col-md-6 col-lg-4">
                    <div class="card template-card shadow-box h-100">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h5 class="card-title mb-0">
                                    <font-awesome-icon v-if="template.icon" :icon="template.icon" class="me-1 text-muted" />
                                    {{ template.name }}
                                </h5>
                                <span class="badge bg-secondary">{{ template.category }}</span>
                            </div>
                            <p class="card-text text-muted small">{{ template.description }}</p>
                        </div>
                        <div class="card-footer bg-transparent border-top-0 d-flex gap-2">
                            <button class="btn btn-primary btn-sm" @click="useTemplate(template)">
                                <font-awesome-icon icon="play" class="me-1" /> {{ $t("useTemplate") }}
                            </button>
                            <button v-if="!template.isBuiltIn" class="btn btn-outline-secondary btn-sm" @click="openEditModal(template)">
                                <font-awesome-icon icon="pen" />
                            </button>
                            <button v-if="!template.isBuiltIn" class="btn btn-outline-danger btn-sm" @click="confirmDelete(template)">
                                <font-awesome-icon icon="trash" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Create / Edit Template Modal -->
            <div v-if="showFormModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">{{ formMode === 'create' ? $t("createTemplate") : $t("editTemplate") }}</h5>
                            <button type="button" class="btn-close" @click="showFormModal = false"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label">{{ $t("templateName") }} <span class="text-danger">*</span></label>
                                <input v-model="form.name" type="text" class="form-control" />
                            </div>
                            <div class="mb-3">
                                <label class="form-label">{{ $t("templateDescription") }}</label>
                                <input v-model="form.description" type="text" class="form-control" />
                            </div>
                            <div class="mb-3">
                                <label class="form-label">{{ $t("templateCategory") }}</label>
                                <input v-model="form.category" type="text" class="form-control" placeholder="Custom" />
                            </div>
                            <div class="mb-3">
                                <label class="form-label">{{ $t("templateComposeYAML") }} <span class="text-danger">*</span></label>
                                <textarea v-model="form.composeYAML" class="form-control code-editor" rows="10"></textarea>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">{{ $t("templateComposeENV") }}</label>
                                <textarea v-model="form.composeENV" class="form-control code-editor" rows="4" placeholder="VARIABLE=value"></textarea>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-normal" @click="showFormModal = false">{{ $t("cancel") }}</button>
                            <button type="button" class="btn btn-primary" :disabled="!form.name || !form.composeYAML" @click="saveTemplate">{{ $t("save") }}</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Confirm Delete Modal -->
            <div v-if="deleteTarget" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">{{ $t("deleteTemplate") }}</h5>
                            <button type="button" class="btn-close" @click="deleteTarget = null"></button>
                        </div>
                        <div class="modal-body">
                            {{ $t("deleteTemplateMsg") }}
                            <div class="mt-2"><strong>{{ deleteTarget.name }}</strong></div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-normal" @click="deleteTarget = null">{{ $t("cancel") }}</button>
                            <button type="button" class="btn btn-danger" @click="deleteTemplate">{{ $t("Confirm") }}</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </transition>
</template>

<script>
export default {
    data() {
        return {
            templates: [],
            loading: true,
            tab: "builtin",
            searchQuery: "",
            categoryFilter: "",
            deleteTarget: null,
            showFormModal: false,
            formMode: "create",
            form: {
                id: "",
                name: "",
                description: "",
                category: "",
                composeYAML: "",
                composeENV: "",
            },
        };
    },
    computed: {
        categories() {
            const cats = new Set(this.templates.map(t => t.category));
            return Array.from(cats).sort();
        },
        filteredTemplates() {
            return this.templates.filter(t => {
                // Tab filter
                if (this.tab === "builtin" && !t.isBuiltIn) { return false; }
                if (this.tab === "custom" && t.isBuiltIn) { return false; }
                // Category filter
                if (this.categoryFilter && t.category !== this.categoryFilter) { return false; }
                // Search filter
                if (this.searchQuery) {
                    const q = this.searchQuery.toLowerCase();
                    return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
                }
                return true;
            });
        },
    },
    mounted() {
        this.loadTemplates();
    },
    methods: {
        loadTemplates() {
            this.loading = true;
            this.$root.getSocket().emit("getTemplateList", (res) => {
                this.loading = false;
                if (res.ok) {
                    this.templates = res.templates;
                } else {
                    this.$root.toastRes(res);
                }
            });
        },
        useTemplate(template) {
            this.$router.push({
                path: "/compose",
                query: {
                    templateId: template.id,
                },
            });
        },
        openCreateModal() {
            this.formMode = "create";
            this.form = {
                id: "",
                name: "",
                description: "",
                category: "",
                composeYAML: "",
                composeENV: "",
            };
            this.showFormModal = true;
        },
        openEditModal(template) {
            this.formMode = "edit";
            this.form = {
                id: template.id,
                name: template.name,
                description: template.description || "",
                category: template.category || "",
                composeYAML: template.composeYAML || "",
                composeENV: template.composeENV || "",
            };
            this.showFormModal = true;
        },
        saveTemplate() {
            if (!this.form.name || !this.form.composeYAML) {
                return;
            }
            this.$root.getSocket().emit("saveCustomTemplate", {
                id: this.form.id,
                name: this.form.name,
                description: this.form.description,
                category: this.form.category || "Custom",
                composeYAML: this.form.composeYAML,
                composeENV: this.form.composeENV,
            }, (res) => {
                this.$root.toastRes(res);
                if (res.ok) {
                    this.showFormModal = false;
                    this.loadTemplates();
                    // Switch to custom tab after saving
                    this.tab = "custom";
                }
            });
        },
        confirmDelete(template) {
            this.deleteTarget = template;
        },
        deleteTemplate() {
            const id = this.deleteTarget.id;
            this.deleteTarget = null;
            this.$root.getSocket().emit("deleteCustomTemplate", id, (res) => {
                this.$root.toastRes(res);
                if (res.ok) {
                    this.loadTemplates();
                }
            });
        },
    },
};
</script>

<style lang="scss" scoped>
.template-card {
    border-radius: 16px;
    transition: transform 0.2s, box-shadow 0.2s;

    &:hover {
        transform: translateY(-2px);
    }
}

.code-editor {
    font-family: SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 13px;
}
</style>
