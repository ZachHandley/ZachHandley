<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from "vue";
import { ID, Query } from "appwrite";
import { BUCKET_FILES } from "astro:env/client";
import { useAppwrite } from "~/components/vue/composables/useAppwrite";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LinkItem {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  title: string;
  url: string;
  icon: string;
  order: number;
  active: boolean;
  type: string;
  category: string;
}

type LinkField = keyof Pick<
  LinkItem,
  "title" | "url" | "icon" | "order" | "active" | "type" | "category"
>;

interface CreateForm {
  title: string;
  url: string;
  icon: string;
  type: string;
  category: string;
  order: number;
  active: boolean;
  fileId?: string;
}

// ─── API Helpers ─────────────────────────────────────────────────────────────

const api = async (action: string, payload: Record<string, any> = {}) => {
  const res = await fetch("/api/links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action, payload }),
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text().catch(() => "Request failed");
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
};

// ─── State ───────────────────────────────────────────────────────────────────

const items = ref<LinkItem[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const search = ref("");
const onlyActive = ref(false);

// Inline editing
const editId = ref<string | null>(null);
const editBuffer = ref<Partial<LinkItem>>({});
const saving = ref(false);

// Create modal
const showCreate = ref(false);
const createForm = ref<CreateForm>({
  title: "",
  url: "",
  icon: "",
  type: "url",
  category: "",
  order: 0,
  active: true,
});
const creating = ref(false);
const createError = ref<string | null>(null);

// File upload
const fileUploading = ref(false);
const fileError = ref<string | null>(null);
const previewUrl = ref<string | null>(null);

// ─── Computed ────────────────────────────────────────────────────────────────

const filteredItems = computed(() => {
  let result = items.value;
  if (onlyActive.value) {
    result = result.filter((item) => item.active);
  }
  if (search.value.trim()) {
    const q = search.value.trim().toLowerCase();
    result = result.filter(
      (item) =>
        item.title?.toLowerCase().includes(q) ||
        item.url?.toLowerCase().includes(q) ||
        item.icon?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q),
    );
  }
  return result;
});

const totalCount = computed(() => items.value.length);
const filteredCount = computed(() => filteredItems.value.length);

// ─── Data Fetching ───────────────────────────────────────────────────────────

const fetchLinks = async () => {
  loading.value = true;
  error.value = null;
  try {
    const queries: string[] = [Query.orderAsc("order")];
    const response = await api("list", { queries, limit: 500 });
    items.value = (response?.documents ?? []) as LinkItem[];
  } catch (err: any) {
    error.value = err?.message || "Failed to load links";
  } finally {
    loading.value = false;
  }
};

// ─── Inline Editing ──────────────────────────────────────────────────────────

const startEdit = (row: LinkItem) => {
  editId.value = row.$id;
  editBuffer.value = {
    title: row.title,
    url: row.url,
    icon: row.icon,
    type: row.type,
    category: row.category,
    order: row.order,
    active: row.active,
  };
};

const cancelEdit = () => {
  editId.value = null;
  editBuffer.value = {};
  saving.value = false;
};

const saveEdit = async () => {
  const id = editId.value;
  if (!id) return;

  saving.value = true;
  error.value = null;
  try {
    const payload: Record<string, any> = { id };
    // Only send changed fields
    const original = items.value.find((i) => i.$id === id);
    if (!original) throw new Error("Item not found");

    const fields: LinkField[] = ["title", "url", "icon", "type", "category", "order", "active"];
    for (const field of fields) {
      const newVal = (editBuffer.value as any)[field];
      if (newVal !== undefined && newVal !== (original as any)[field]) {
        payload[field] = newVal;
      }
    }

    // Only send if there are actual changes
    if (Object.keys(payload).length <= 1) {
      cancelEdit();
      return;
    }

    const updated = await api("update", payload);
    // Replace item in local array
    const idx = items.value.findIndex((i) => i.$id === id);
    if (idx !== -1 && updated) {
      items.value[idx] = updated as LinkItem;
    }
    cancelEdit();
  } catch (err: any) {
    error.value = err?.message || "Failed to save";
    saving.value = false;
  }
};

// ─── Quick Toggle Active ─────────────────────────────────────────────────────

const toggleActive = async (row: LinkItem) => {
  try {
    const updated = await api("update", { id: row.$id, active: !row.active });
    const idx = items.value.findIndex((i) => i.$id === row.$id);
    if (idx !== -1 && updated) {
      items.value[idx] = updated as LinkItem;
    }
  } catch (err: any) {
    error.value = err?.message || "Failed to toggle active";
  }
};

// ─── Create ──────────────────────────────────────────────────────────────────

const resetCreateForm = () => {
  createForm.value = {
    title: "",
    url: "",
    icon: "",
    type: "url",
    category: "",
    order: 0,
    active: true,
  };
  previewUrl.value = null;
  fileError.value = null;
  createError.value = null;
};

const openCreate = () => {
  resetCreateForm();
  // Default order to one beyond the max
  const maxOrder = items.value.reduce((max, i) => Math.max(max, i.order ?? 0), 0);
  createForm.value.order = maxOrder + 1;
  showCreate.value = true;
};

const closeCreate = () => {
  showCreate.value = false;
  resetCreateForm();
};

const createLink = async () => {
  if (!createForm.value.title.trim()) {
    createError.value = "Title is required";
    return;
  }
  creating.value = true;
  createError.value = null;
  try {
    const payload: Record<string, any> = {
      title: createForm.value.title.trim(),
      url: createForm.value.url.trim() || null,
      icon: createForm.value.icon.trim() || null,
      type: createForm.value.type,
      category: createForm.value.category.trim() || null,
      order: createForm.value.order,
      active: createForm.value.active,
    };
    if (createForm.value.fileId) {
      payload.fileId = createForm.value.fileId;
    }
    const created = await api("create", payload);
    if (created) {
      items.value = [...items.value, created as LinkItem].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      );
    }
    closeCreate();
  } catch (err: any) {
    createError.value = err?.message || "Failed to create link";
  } finally {
    creating.value = false;
  }
};

// ─── File Upload ─────────────────────────────────────────────────────────────

const onFileSelected = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  fileError.value = null;
  fileUploading.value = true;
  try {
    const { storage } = useAppwrite();
    const bucketId = BUCKET_FILES || "files";
    const result = await storage.createFile(bucketId, ID.unique(), file);
    createForm.value.fileId = result.$id;
    // Build preview URL
    try {
      const url = storage.getFilePreview(bucketId, result.$id, 256, 256);
      previewUrl.value = typeof url === "string" ? url : ((url as any)?.href ?? null);
    } catch {
      previewUrl.value = null;
    }
  } catch (err: any) {
    fileError.value = err?.message || "Upload failed";
  } finally {
    fileUploading.value = false;
  }
};

const clearFile = () => {
  createForm.value.fileId = undefined;
  previewUrl.value = null;
  fileError.value = null;
};

// ─── Delete ──────────────────────────────────────────────────────────────────

const deleteLink = async (id: string) => {
  if (!confirm("Are you sure you want to delete this link?")) return;
  try {
    await api("delete", { id });
    items.value = items.value.filter((i) => i.$id !== id);
    // If we were editing this item, cancel
    if (editId.value === id) cancelEdit();
  } catch (err: any) {
    error.value = err?.message || "Failed to delete";
  }
};

// ─── Keyboard Shortcuts ──────────────────────────────────────────────────────

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape") {
    if (showCreate.value) closeCreate();
    else if (editId.value) cancelEdit();
  }
};

onMounted(() => {
  fetchLinks();
  window.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <div class="space-y-4">
    <!-- Toolbar -->
    <div class="flex flex-col sm:flex-row sm:items-center gap-3">
      <div class="flex-1 flex flex-col sm:flex-row gap-2 sm:items-center">
        <div class="relative flex-1">
          <input
            v-model="search"
            placeholder="Search by title, URL, icon, or category..."
            class="w-full px-3 py-2 pl-9 rounded-lg bg-gray-800 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
          />
          <svg
            class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <label
          class="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none whitespace-nowrap"
        >
          <input
            type="checkbox"
            v-model="onlyActive"
            class="rounded bg-gray-700 border-gray-600 text-orange-500 focus:ring-orange-500/50"
          />
          Active only
        </label>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-xs text-gray-500">
          {{ filteredCount
          }}<template v-if="filteredCount !== totalCount"> / {{ totalCount }}</template> links
        </span>
        <button
          @click="fetchLinks"
          :disabled="loading"
          class="px-3 py-2 text-sm rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors disabled:opacity-50"
          title="Refresh"
        >
          Refresh
        </button>
        <button
          @click="openCreate"
          class="px-4 py-2 text-sm font-medium rounded-lg bg-orange-600 hover:bg-orange-500 text-white transition-colors"
        >
          + New Link
        </button>
      </div>
    </div>

    <!-- Error banner -->
    <div
      v-if="error"
      class="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-900/30 border border-red-500/30 text-red-300 text-sm"
    >
      <span class="flex-1">{{ error }}</span>
      <button @click="error = null" class="text-red-400 hover:text-red-200">&times;</button>
    </div>

    <!-- Loading state -->
    <div v-if="loading && items.length === 0" class="flex items-center justify-center py-16">
      <div class="flex flex-col items-center gap-3">
        <div
          class="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"
        ></div>
        <span class="text-gray-400 text-sm">Loading links...</span>
      </div>
    </div>

    <!-- Table -->
    <div v-else class="bg-gray-800/50 border border-white/10 rounded-xl overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-800/80 text-gray-400 text-xs uppercase tracking-wider">
              <th class="px-3 py-3 text-left w-16">#</th>
              <th class="px-3 py-3 text-left">Title</th>
              <th class="px-3 py-3 text-left w-24">Type</th>
              <th class="px-3 py-3 text-left">URL</th>
              <th class="px-3 py-3 text-left w-48">Icon</th>
              <th class="px-3 py-3 text-left w-32">Category</th>
              <th class="px-3 py-3 text-center w-20">Active</th>
              <th class="px-3 py-3 text-right w-44">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            <tr v-if="filteredItems.length === 0 && !loading">
              <td colspan="8" class="px-3 py-12 text-center text-gray-500">
                <template v-if="search || onlyActive">No links match your filters.</template>
                <template v-else>No links yet. Click "New Link" to create one.</template>
              </td>
            </tr>
            <tr
              v-for="row in filteredItems"
              :key="row.$id"
              :class="[
                'transition-colors',
                editId === row.$id ? 'bg-gray-700/30' : 'hover:bg-gray-800/30',
              ]"
            >
              <!-- Order -->
              <td class="px-3 py-2">
                <input
                  v-if="editId === row.$id"
                  type="number"
                  v-model.number="(editBuffer as any).order"
                  class="w-14 bg-gray-700 border border-white/10 text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                />
                <span v-else class="text-gray-400 font-mono text-xs">{{ row.order }}</span>
              </td>

              <!-- Title -->
              <td class="px-3 py-2">
                <input
                  v-if="editId === row.$id"
                  v-model="(editBuffer as any).title"
                  class="w-full bg-gray-700 border border-white/10 text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                />
                <span v-else class="font-medium text-white">{{ row.title }}</span>
              </td>

              <!-- Type -->
              <td class="px-3 py-2">
                <select
                  v-if="editId === row.$id"
                  v-model="(editBuffer as any).type"
                  class="w-full bg-gray-700 border border-white/10 text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                >
                  <option value="url">url</option>
                  <option value="download">download</option>
                  <option value="contact">contact</option>
                  <option value="action">action</option>
                  <option value="category">category</option>
                </select>
                <span
                  v-else
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                  :class="{
                    'bg-blue-900/40 text-blue-300': row.type === 'url',
                    'bg-green-900/40 text-green-300': row.type === 'download',
                    'bg-purple-900/40 text-purple-300': row.type === 'contact',
                    'bg-yellow-900/40 text-yellow-300': row.type === 'action',
                    'bg-gray-700/40 text-gray-300': row.type === 'category',
                  }"
                >
                  {{ row.type }}
                </span>
              </td>

              <!-- URL -->
              <td class="px-3 py-2 max-w-[20rem]">
                <input
                  v-if="editId === row.$id"
                  v-model="(editBuffer as any).url"
                  class="w-full bg-gray-700 border border-white/10 text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                  placeholder="https://..."
                />
                <a
                  v-else-if="row.url"
                  :href="row.url"
                  target="_blank"
                  rel="noopener"
                  class="text-orange-300 hover:text-orange-200 hover:underline truncate block text-sm"
                  :title="row.url"
                >
                  {{ row.url }}
                </a>
                <span v-else class="text-gray-600 text-xs italic">none</span>
              </td>

              <!-- Icon -->
              <td class="px-3 py-2">
                <input
                  v-if="editId === row.$id"
                  v-model="(editBuffer as any).icon"
                  class="w-full bg-gray-700 border border-white/10 text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                  placeholder="simple-icons:github"
                />
                <span
                  v-else-if="row.icon"
                  class="text-gray-300 text-xs font-mono truncate block"
                  :title="row.icon"
                  >{{ row.icon }}</span
                >
                <span v-else class="text-gray-600 text-xs italic">none</span>
              </td>

              <!-- Category -->
              <td class="px-3 py-2">
                <input
                  v-if="editId === row.$id"
                  v-model="(editBuffer as any).category"
                  class="w-full bg-gray-700 border border-white/10 text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                />
                <span v-else-if="row.category" class="text-gray-300 text-sm">{{
                  row.category
                }}</span>
                <span v-else class="text-gray-600 text-xs italic">none</span>
              </td>

              <!-- Active -->
              <td class="px-3 py-2 text-center">
                <input
                  v-if="editId === row.$id"
                  type="checkbox"
                  v-model="(editBuffer as any).active"
                  class="rounded bg-gray-700 border-gray-600 text-orange-500 focus:ring-orange-500/50"
                />
                <button
                  v-else
                  @click="toggleActive(row)"
                  :class="[
                    'inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors',
                    row.active
                      ? 'bg-green-900/40 text-green-400 hover:bg-green-900/60'
                      : 'bg-gray-700/40 text-gray-500 hover:bg-gray-700/60',
                  ]"
                  :title="
                    row.active ? 'Active - click to deactivate' : 'Inactive - click to activate'
                  "
                >
                  <svg
                    v-if="row.active"
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </td>

              <!-- Actions -->
              <td class="px-3 py-2 text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <template v-if="editId === row.$id">
                    <button
                      @click="saveEdit"
                      :disabled="saving"
                      class="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
                    >
                      {{ saving ? "Saving..." : "Save" }}
                    </button>
                    <button
                      @click="cancelEdit"
                      class="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-600 hover:bg-gray-500 text-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </template>
                  <template v-else>
                    <button
                      @click="startEdit(row)"
                      class="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      @click="deleteLink(row.$id)"
                      class="px-3 py-1.5 text-xs font-medium rounded-md bg-red-700/60 hover:bg-red-600 text-red-200 transition-colors"
                    >
                      Delete
                    </button>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Loading overlay for refresh -->
      <div v-if="loading && items.length > 0" class="px-4 py-2 bg-gray-800/80 text-center">
        <span class="text-gray-400 text-xs">Refreshing...</span>
      </div>
    </div>

    <!-- Create Modal -->
    <Teleport to="body">
      <div v-if="showCreate" class="fixed inset-0 z-[100] flex items-center justify-center">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeCreate"></div>

        <!-- Modal -->
        <div
          class="relative bg-gray-800 border border-white/10 rounded-xl shadow-2xl w-[560px] max-w-[95vw] max-h-[90vh] overflow-y-auto"
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <h3 class="text-lg font-semibold text-white">Create New Link</h3>
            <button
              @click="closeCreate"
              class="text-gray-400 hover:text-white transition-colors text-xl leading-none"
            >
              &times;
            </button>
          </div>

          <!-- Form -->
          <div class="px-5 py-4 space-y-4">
            <!-- Title -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1"
                >Title <span class="text-red-400">*</span></label
              >
              <input
                v-model="createForm.title"
                placeholder="My Link"
                class="w-full px-3 py-2 rounded-lg bg-gray-700 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
              />
            </div>

            <!-- URL -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">URL</label>
              <input
                v-model="createForm.url"
                placeholder="https://example.com"
                class="w-full px-3 py-2 rounded-lg bg-gray-700 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
              />
              <p v-if="createForm.fileId" class="mt-1 text-xs text-gray-500">
                URL will be overridden by the uploaded file.
              </p>
            </div>

            <!-- Icon -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Icon</label>
              <input
                v-model="createForm.icon"
                placeholder="simple-icons:github"
                class="w-full px-3 py-2 rounded-lg bg-gray-700 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
              />
              <p class="mt-1 text-xs text-gray-500">
                Iconify icon name (e.g. simple-icons:github, mdi:email)
              </p>
            </div>

            <!-- Type + Category row -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Type</label>
                <select
                  v-model="createForm.type"
                  class="w-full px-3 py-2 rounded-lg bg-gray-700 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                >
                  <option value="url">url</option>
                  <option value="download">download</option>
                  <option value="contact">contact</option>
                  <option value="action">action</option>
                  <option value="category">category</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Category</label>
                <input
                  v-model="createForm.category"
                  placeholder="personal"
                  class="w-full px-3 py-2 rounded-lg bg-gray-700 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                />
              </div>
            </div>

            <!-- Order + Active row -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Order</label>
                <input
                  type="number"
                  v-model.number="createForm.order"
                  class="w-full px-3 py-2 rounded-lg bg-gray-700 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                />
              </div>
              <div class="flex items-end pb-2">
                <label
                  class="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    v-model="createForm.active"
                    class="rounded bg-gray-700 border-gray-600 text-orange-500 focus:ring-orange-500/50"
                  />
                  Active
                </label>
              </div>
            </div>

            <!-- File Upload -->
            <div class="rounded-lg border border-white/10 bg-gray-900/50 p-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-300">Attach File (optional)</span>
                <button
                  v-if="previewUrl || createForm.fileId"
                  @click="clearFile"
                  class="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                >
                  Remove
                </button>
              </div>
              <div class="flex items-center gap-3">
                <input
                  type="file"
                  @change="onFileSelected"
                  :disabled="fileUploading"
                  class="text-sm text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-gray-700 file:text-gray-200 hover:file:bg-gray-600 file:cursor-pointer file:transition-colors"
                />
                <img
                  v-if="previewUrl"
                  :src="previewUrl"
                  alt="preview"
                  class="w-12 h-12 object-cover rounded border border-white/10"
                />
              </div>
              <p v-if="fileUploading" class="mt-2 text-xs text-gray-400">Uploading...</p>
              <p v-if="fileError" class="mt-2 text-xs text-red-400">{{ fileError }}</p>
              <p
                v-if="createForm.fileId && !fileError && !fileUploading"
                class="mt-2 text-xs text-green-400"
              >
                File uploaded successfully
              </p>
            </div>

            <!-- Create error -->
            <p v-if="createError" class="text-sm text-red-400">{{ createError }}</p>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/10">
            <button
              @click="closeCreate"
              class="px-4 py-2 text-sm rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              @click="createLink"
              :disabled="creating || fileUploading"
              class="px-4 py-2 text-sm font-medium rounded-lg bg-orange-600 hover:bg-orange-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ creating ? "Creating..." : "Create Link" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
table {
  border-collapse: collapse;
}
</style>
