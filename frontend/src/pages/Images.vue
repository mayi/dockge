<template>
    <transition name="slide-fade" appear>
        <div>
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h1 class="mb-0">{{ $t("images") }}</h1>
                <div class="d-flex gap-2">
                    <button class="btn btn-outline-danger btn-sm" @click="confirmPrune">
                        <font-awesome-icon icon="broom" class="me-1" /> {{ $t("pruneImages") }}
                    </button>
                    <button class="btn btn-normal btn-sm" @click="loadImages">
                        <font-awesome-icon icon="rotate" class="me-1" /> {{ $t("refresh") }}
                    </button>
                </div>
            </div>

            <div v-if="loading" class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>

            <div v-else-if="images.length === 0" class="text-center py-4 text-muted">
                {{ $t("noImages") }}
            </div>

            <template v-else>
                <div class="mb-3 text-muted small">
                    {{ $t("diskUsage") }}: {{ totalSize }}
                </div>

                <div class="shadow-box">
                    <table class="table table-hover mb-0">
                        <thead>
                            <tr>
                                <th>{{ $t("repository") }}</th>
                                <th>{{ $t("tag") }}</th>
                                <th>{{ $t("imageId") }}</th>
                                <th>{{ $t("imageSize") }}</th>
                                <th>{{ $t("createdAt") }}</th>
                                <th style="width: 80px;"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="image in images" :key="image.id">
                                <td>{{ image.repository }}</td>
                                <td><span class="badge bg-secondary">{{ image.tag }}</span></td>
                                <td class="text-muted small">{{ image.id.substring(0, 12) }}</td>
                                <td>{{ image.size }}</td>
                                <td class="text-muted small">{{ image.createdAt }}</td>
                                <td>
                                    <button class="btn btn-outline-danger btn-sm" @click="confirmRemove(image)">
                                        <font-awesome-icon icon="trash" />
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </template>

            <!-- Confirm Remove Modal -->
            <div v-if="removeTarget" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">{{ $t("removeImage") }}</h5>
                            <button type="button" class="btn-close" @click="removeTarget = null"></button>
                        </div>
                        <div class="modal-body">
                            {{ $t("removeImageMsg") }}
                            <div class="mt-2"><strong>{{ removeTarget.repository }}:{{ removeTarget.tag }}</strong></div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-normal" @click="removeTarget = null">{{ $t("cancel") }}</button>
                            <button type="button" class="btn btn-danger" @click="removeImage">{{ $t("Confirm") }}</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Confirm Prune Modal -->
            <div v-if="showPruneDialog" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">{{ $t("pruneImages") }}</h5>
                            <button type="button" class="btn-close" @click="showPruneDialog = false"></button>
                        </div>
                        <div class="modal-body">
                            {{ $t("pruneImagesMsg") }}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-normal" @click="showPruneDialog = false">{{ $t("cancel") }}</button>
                            <button type="button" class="btn btn-danger" @click="pruneImages">{{ $t("Confirm") }}</button>
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
            images: [],
            loading: true,
            removeTarget: null,
            showPruneDialog: false,
        };
    },
    computed: {
        totalSize() {
            // Sum up sizes from the image list (approximate)
            return `${this.images.length} images`;
        },
    },
    mounted() {
        this.loadImages();
    },
    methods: {
        loadImages() {
            this.loading = true;
            this.$root.emitAgent("", "listDockerImages", (res) => {
                this.loading = false;
                if (res.ok) {
                    this.images = res.images || [];
                } else {
                    this.$root.toastRes(res);
                }
            });
        },
        confirmRemove(image) {
            this.removeTarget = image;
        },
        removeImage() {
            const id = this.removeTarget.id;
            this.removeTarget = null;
            this.$root.emitAgent("", "removeDockerImage", id, (res) => {
                this.$root.toastRes(res);
                if (res.ok) {
                    this.loadImages();
                }
            });
        },
        confirmPrune() {
            this.showPruneDialog = true;
        },
        pruneImages() {
            this.showPruneDialog = false;
            this.$root.emitAgent("", "pruneDockerImages", (res) => {
                this.$root.toastRes(res);
                if (res.ok) {
                    this.loadImages();
                }
            });
        },
    },
};
</script>

<style lang="scss" scoped>
.shadow-box {
    border-radius: 16px;
    overflow: hidden;
}

.table {
    th {
        font-weight: 600;
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    td {
        vertical-align: middle;
    }
}
</style>
