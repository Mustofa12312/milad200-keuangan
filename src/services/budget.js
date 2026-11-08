import supabase from './supabase'
import { logAudit } from './auditLog'
import { eventService } from './events'

const CONFIG_KEY = '__CONFIG_EVENT_BUDGETS__'

export const budgetService = {
  // 1. Get raw budgets map { [eventName]: number }
  async getBudgets() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('description')
        .eq('name', CONFIG_KEY)
        .maybeSingle()

      if (error || !data) return {}
      try {
        return JSON.parse(data.description) || {}
      } catch {
        return {}
      }
    } catch {
      return {}
    }
  },

  // 2. Save budget for a single event
  async setBudget(eventName, amount, userId) {
    const current = await this.getBudgets()
    const updated = { ...current, [eventName]: Number(amount) || 0 }
    return this.saveAllBudgets(
      updated,
      userId,
      `Set budget ${eventName}: Rp ${Number(amount).toLocaleString('id-ID')}`
    )
  },

  // 3. Save all budgets map
  async saveAllBudgets(budgetsMap, userId, auditNote) {
    const jsonStr = JSON.stringify(budgetsMap)
    const { data, error } = await supabase
      .from('categories')
      .upsert(
        {
          name: CONFIG_KEY,
          description: jsonStr,
          is_active: false,
          created_by: userId || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'name' }
      )
      .select()
      .single()

    if (error) throw error

    if (userId) {
      await logAudit(
        userId,
        'UPDATE',
        'budget',
        data.id,
        null,
        { note: auditNote || 'Update pagu anggaran RAB' }
      )
    }

    return budgetsMap
  },

  // 4. Get comprehensive comparison: Pos Acara + Budgets + Actual Expenses
  async getBudgetSummary() {
    // A. Get all events
    const events = await eventService.getEvents()

    // B. Get budgets map
    const budgetsMap = await this.getBudgets()

    // C. Get all non-deleted expenses with their source
    const { data: expenses, error: expError } = await supabase
      .from('transactions')
      .select('id, amount, source, transaction_date')
      .eq('type', 'EXPENSE')
      .eq('is_deleted', false)

    if (expError) throw expError

    // Group actual spending by event name (source)
    const spentMap = {}
    const countMap = {}
    expenses?.forEach(tx => {
      const src = tx.source || 'Tanpa Pos Acara'
      spentMap[src] = (spentMap[src] || 0) + Number(tx.amount || 0)
      countMap[src] = (countMap[src] || 0) + 1
    })

    // Build event items
    const items = events.map(ev => {
      const budget = Number(budgetsMap[ev.name] || 0)
      const spent = Number(spentMap[ev.name] || 0)
      const count = Number(countMap[ev.name] || 0)
      const remaining = budget - spent
      const percent = budget > 0 ? (spent / budget) * 100 : 0

      let status = 'UNSET'
      if (budget > 0) {
        if (spent > budget) status = 'OVER'
        else if (spent >= 0.75 * budget) status = 'WARNING'
        else status = 'SAFE'
      }

      return {
        id: ev.id,
        name: ev.name,
        budget,
        spent,
        count,
        remaining,
        percent,
        status,
      }
    })

    // Include custom sources if any
    const eventNames = new Set(events.map(e => e.name))
    const extraSources = Object.keys(spentMap).filter(src => !eventNames.has(src))
    extraSources.forEach(src => {
      const budget = Number(budgetsMap[src] || 0)
      const spent = Number(spentMap[src] || 0)
      const count = Number(countMap[src] || 0)
      const remaining = budget - spent
      const percent = budget > 0 ? (spent / budget) * 100 : 0
      let status = 'UNSET'
      if (budget > 0) {
        if (spent > budget) status = 'OVER'
        else if (spent >= 0.75 * budget) status = 'WARNING'
        else status = 'SAFE'
      }

      items.push({
        id: `custom-${src}`,
        name: src,
        budget,
        spent,
        count,
        remaining,
        percent,
        status,
        isCustom: true,
      })
    })

    // Summary totals
    const totalBudget = items.reduce((sum, item) => sum + item.budget, 0)
    const totalSpent = items.reduce((sum, item) => sum + item.spent, 0)
    const totalRemaining = totalBudget - totalSpent
    const totalPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
    const overBudgetCount = items.filter(item => item.status === 'OVER').length
    const warningCount = items.filter(item => item.status === 'WARNING').length

    return {
      items,
      totals: {
        totalBudget,
        totalSpent,
        totalRemaining,
        totalPercent,
        overBudgetCount,
        warningCount,
      },
      budgetsMap,
      spentMap,
    }
  },
}

