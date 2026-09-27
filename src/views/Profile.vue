<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTravelStore } from '../stores/travel'
import { formatMoney, formatDate } from '../utils/format'
import { planTotalSpend, planPackingRate } from '../services/selectors'
import StarRating from '../components/common/StarRating.vue'
import DonutChart from '../components/charts/DonutChart.vue'

const store = useTravelStore()
const router = useRouter()

const stats = computed(() => store.dashboardStats)
const unlocked = computed(() => store.achievements.filter((a) => a.unlocked))
const summarized = computed(() => store.plans.filter((p) => p.summary))

// ===== 年度花费回顾（默认当前年） =====
const currentYear = new Date().getFullYear()
const selectedYear = ref(currentYear)
const yearly = computed(() => store.yearlyStats(selectedYear.value))
const money = (v) => formatMoney(v)

const yearIndex = computed(() => yearly.value.years.indexOf(selectedYear.value))
const hasPrevYear = computed(() => yearIndex.value > 0)
const hasNextYear = computed(() => yearIndex.value < yearly.value.years.length - 1)

function switchYear(year) {
  const years = yearly.value.years
  if (year < years[0] || year > years[years.length - 1]) return
  selectedYear.value = year
}
</script>

<template>
  <div>
    <!-- 概览 -->
    <div class="grid-3">
      <div class="card stat">
        <span class="stat-label">累计出行次数</span>
        <strong>{{ stats.totalTrips }}</strong>
      </div>
      <div class="card stat">
        <span class="stat-label">总花费</span>
        <strong>{{ formatMoney(stats.totalSpend) }}</strong>
      </div>
      <div class="card stat">
        <span class="stat-label">已解锁徽章</span>
        <strong>{{ unlocked.length }} / {{ store.totalAchievements }}</strong>
      </div>
    </div>

    <!-- 年度花费回顾 -->
    <div class="card mt-16">
      <div class="card-title">
        <span>年度花费回顾</span>
        <div class="year-switch">
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            :disabled="!hasPrevYear"
            @click="switchYear(selectedYear - 1)"
          >&lt;</button>
          <select v-model.number="selectedYear" class="select year-select">
            <option v-for="y in yearly.years" :key="y" :value="y">{{ y }}年</option>
          </select>
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            :disabled="!hasNextYear"
            @click="switchYear(selectedYear + 1)"
          >&gt;</button>
        </div>
      </div>

      <template v-if="yearly.hasData">
        <div class="year-summary">
          <div class="stat year-stat">
            <span class="stat-label">总花费</span>
            <strong>{{ formatMoney(yearly.totalSpend) }}</strong>
          </div>
          <div class="stat year-stat">
            <span class="stat-label">出行次数</span>
            <strong>{{ yearly.totalTrips }} 次</strong>
          </div>
        </div>
        <h4 class="section-subtitle">分类占比</h4>
        <DonutChart :data="yearly.categorySpend" :formatter="money" />
      </template>
      <p v-else class="empty">{{ selectedYear }}年暂无出行花费记录</p>
    </div>

    <!-- 我的出行计划 -->
    <div class="card mt-16">
      <h3 class="card-title">我的出行计划</h3>
      <table v-if="store.plans.length" class="table">
        <thead>
          <tr><th>名称</th><th>目的地</th><th>日期</th><th>花费</th><th>打包</th></tr>
        </thead>
        <tbody>
          <tr v-for="p in store.plans" :key="p.id" class="link-row" @click="router.push(`/plans/${p.id}`)">
            <td>{{ p.name }}</td>
            <td>{{ p.destination }}</td>
            <td>{{ formatDate(p.startDate) }} - {{ formatDate(p.endDate) }}</td>
            <td>{{ formatMoney(planTotalSpend(p)) }}</td>
            <td>{{ planPackingRate(p) }}%</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">暂无出行计划</p>
    </div>

    <!-- 出行总结 -->
    <div class="card mt-16">
      <h3 class="card-title">出行总结</h3>
      <div v-if="summarized.length" class="summary-list">
        <div v-for="p in summarized" :key="p.id" class="summary-item">
          <div>
            <strong>{{ p.name }}</strong>
            <span class="text-muted">{{ p.destination }}</span>
          </div>
          <StarRating :model-value="p.summary.rating" readonly size="16px" />
        </div>
      </div>
      <p v-else class="empty">还没有出行总结，去出行结束后撰写吧</p>
    </div>

    <!-- 成就徽章 -->
    <div class="card mt-16">
      <h3 class="card-title">我的成就徽章</h3>
      <div v-if="unlocked.length" class="badge-list">
        <div v-for="a in unlocked" :key="a.id" class="badge">
          <div class="badge-icon" :style="{ background: a.color }">{{ a.glyph }}</div>
          <div class="badge-name">{{ a.name }}</div>
        </div>
      </div>
      <p v-else class="empty">还没有解锁徽章</p>
    </div>
  </div>
</template>

<style scoped>
.stat {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.stat strong {
  font-size: 26px;
  margin-top: 6px;
}

.link-row {
  cursor: pointer;
}

.year-switch {
  display: flex;
  align-items: center;
  gap: 8px;
}

.year-select {
  width: auto;
  padding: 5px 10px;
  font-size: 13px;
}

.year-summary {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.year-stat {
  background: var(--bg);
  border-radius: var(--radius-sm);
  padding: 14px;
}

.section-subtitle {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

.summary-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.summary-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--bg);
  border-radius: var(--radius-sm);
}

.summary-item div {
  display: flex;
  flex-direction: column;
}

.summary-item .text-muted {
  font-size: 13px;
}
</style>
