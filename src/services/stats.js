import { TRIP_TYPES, EXPENSE_CATEGORIES } from '../constants'
import { luggageCompletionRate } from './luggage'
import { planTotalSpend, planPackingRate, planSpendBreakdown } from './selectors'

// 出行所属年份（按开始日期归属，无有效日期返回 null）
export function planYear(plan) {
  const year = Number(String(plan?.startDate || '').slice(0, 4))
  return year > 0 ? year : null
}

// 花费汇总口径（出行看板 / 年度回顾共用）：出行次数、总花费、分类花费
export function aggregateSpendStats(plans) {
  const totalTrips = plans.length
  const totalSpend = plans.reduce((sum, p) => sum + planTotalSpend(p), 0)

  // 花费分类汇总
  const categorySpend = EXPENSE_CATEGORIES.map(({ label }) => ({ label, value: 0 }))
  plans.forEach((p) => {
    const breakdown = planSpendBreakdown(p)
    categorySpend.forEach((c) => {
      c.value += breakdown[c.label] || 0
    })
  })

  return { totalTrips, totalSpend, categorySpend }
}

// 可切换的年份范围（始终包含当前年份，边界按升序返回）
export function getYearBounds(plans, currentYear) {
  const years = plans.map(planYear).filter((y) => y !== null)
  return {
    min: Math.min(currentYear, ...years),
    max: Math.max(currentYear, ...years),
  }
}

// 年度花费汇总（统计口径与出行看板一致，仅按年份筛选出行）
export function computeYearlyStats(plans, year) {
  return aggregateSpendStats(plans.filter((p) => planYear(p) === year))
}

// ===== 出行看板统计 =====
export function computeDashboardStats(plans) {
  const { totalTrips, totalSpend, categorySpend } = aggregateSpendStats(plans)
  const totalBudget = plans.reduce((sum, p) => sum + (Number(p.budget) || 0), 0)
  const totalDays = plans.reduce((sum, p) => sum + (Number(p.days) || 0), 0)

  const avgDays = totalTrips ? Math.round((totalDays / totalTrips) * 10) / 10 : 0
  const avgPackingRate = totalTrips
    ? Math.round(plans.reduce((sum, p) => sum + planPackingRate(p), 0) / totalTrips)
    : 0

  // 最常去目的地
  const destCount = {}
  plans.forEach((p) => {
    if (p.destination) destCount[p.destination] = (destCount[p.destination] || 0) + 1
  })
  const mostVisited =
    Object.entries(destCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

  // 出行类型分布
  const tripTypeDist = TRIP_TYPES.map((label) => ({
    label,
    value: plans.filter((p) => p.tripType === label).length,
  }))

  // 各次出行花费对比
  const perTripSpend = plans.map((p) => ({ label: p.name, value: planTotalSpend(p) }))

  return {
    totalTrips,
    totalSpend,
    totalBudget,
    avgDays,
    avgPackingRate,
    mostVisited,
    balance: totalBudget - totalSpend,
    tripTypeDist,
    categorySpend,
    perTripSpend,
  }
}

// ===== 成员聚合（供排行榜使用） =====
export function computeMemberLeaderboard(plans) {
  const map = new Map()

  plans.forEach((plan) => {
    ;(plan.members || []).forEach((m) => {
      if (!map.has(m.name)) {
        map.set(m.name, {
          name: m.name,
          trips: 0,
          packingSum: 0,
          packingCount: 0,
          ratingSum: 0,
          ratingCount: 0,
        })
      }
      const entry = map.get(m.name)
      entry.trips += 1

      const list = (plan.luggage || []).find((l) => l.memberId === m.id)
      if (list) {
        entry.packingSum += luggageCompletionRate(list.items)
        entry.packingCount += 1
      }

      if (plan.summary && plan.summary.rating) {
        entry.ratingSum += plan.summary.rating
        entry.ratingCount += 1
      }
    })
  })

  const members = [...map.values()].map((e) => ({
    name: e.name,
    trips: e.trips,
    avgPackingRate: e.packingCount ? Math.round(e.packingSum / e.packingCount) : 0,
    avgRating: e.ratingCount ? Math.round((e.ratingSum / e.ratingCount) * 10) / 10 : 0,
    // 出行达人综合分：出行次数权重更高，总结质量作为加成
    travelScore: e.trips * 10 + (e.ratingCount ? e.ratingSum / e.ratingCount : 0),
  }))

  return {
    travelMasterBoard: [...members].sort(
      (a, b) => b.travelScore - a.travelScore || b.avgRating - a.avgRating
    ),
    luggageMasterBoard: [...members].sort(
      (a, b) => b.avgPackingRate - a.avgPackingRate || b.trips - a.trips
    ),
  }
}
