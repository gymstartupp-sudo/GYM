export const toLocalDateString = (value) => {
  if (!value) return '';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
};

export const formatDisplayDate = (value) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString('en-GB').replace(/\//g, '-');
};

export const calculateDaysLeft = (startDateValue, endDateValue) => {
  // Overload: if only 1 param passed, treat as endDateValue
  if (!endDateValue) {
    endDateValue = startDateValue;
    startDateValue = null;
  }

  if (!endDateValue) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(endDateValue);
  endDate.setHours(0, 0, 0, 0);

  if (Number.isNaN(endDate.getTime())) {
    return null;
  }

  if (startDateValue) {
    const startDate = new Date(startDateValue);
    startDate.setHours(0, 0, 0, 0);
    
    if (!Number.isNaN(startDate.getTime()) && today.getTime() < startDate.getTime()) {
      const diffDays = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return `Starts in ${diffDays} days`;
    }
  }



  return Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export const getPlanStatus = (plan, today = new Date()) => {
  const t = new Date(today);
  t.setHours(0,0,0,0);
  const s = new Date(plan.startDate);
  s.setHours(0,0,0,0);
  const e = new Date(plan.endDate);
  e.setHours(0,0,0,0);

  if (t < s) return 'upcoming';
  if (t > e) return 'expired';

  const diffTime = e.getTime() - t.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (daysLeft <= 3 && daysLeft >= 0) {
    return 'expiring_soon';
  }

  return 'active';
};

export const getPaymentStatus = (plan, today = new Date()) => {
  const t = new Date(today);
  t.setHours(0,0,0,0);
  const s = new Date(plan.startDate);
  s.setHours(0,0,0,0);
  const d = plan.dueDate ? new Date(plan.dueDate) : null;
  if (d) d.setHours(0,0,0,0);

  const finalPrice = Number(plan.finalPrice) || 0;
  const totalPaid = Number(plan.totalPaid) || 0;

  if (totalPaid >= finalPrice && finalPrice > 0) {
    return 'paid';
  }

  // Before start date
  if (t < s) {
    return 'pending';
  }

  // Grace period
  if (d && t <= d) {
    return 'pending';
  }

  return 'overdue';
};

export const getClientPlans = (memberships, today = new Date()) => {
  if (!memberships || !Array.isArray(memberships)) {
    return { currentPlan: null, nextPlan: null, previousPlans: [], gaps: [] };
  }

  const sorted = [...memberships].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  
  let currentPlan = null;
  let nextPlan = null;
  const previousPlans = [];
  const gaps = [];

  for (let i = 0; i < sorted.length; i++) {
    const plan = sorted[i];
    const mStatus = getPlanStatus(plan, today);
    const pStatus = getPaymentStatus(plan, today);
    
    const enrichedPlan = { 
      ...plan, 
      status: mStatus, 
      paymentStatus: pStatus 
    };

    if (mStatus === 'active') {
      currentPlan = enrichedPlan;
    } else if (mStatus === 'upcoming' && !nextPlan) {
      nextPlan = enrichedPlan;
    } else if (mStatus === 'expired') {
      previousPlans.push(enrichedPlan);
    }

    if (i < sorted.length - 1) {
      const cEnd = new Date(plan.endDate);
      cEnd.setHours(0,0,0,0);
      const nStart = new Date(sorted[i+1].startDate);
      nStart.setHours(0,0,0,0);
      
      const oneDay = 24 * 60 * 60 * 1000;
      if (nStart.getTime() > cEnd.getTime() + oneDay) {
        gaps.push({
          from: new Date(cEnd.getTime() + oneDay),
          to: new Date(nStart.getTime() - oneDay)
        });
      }
    }
  }

  return { 
    currentPlan, 
    nextPlan, 
    previousPlans: previousPlans.reverse(),
    gaps
  };
};

export const calculateEndDate = (startDate, durationMonths) => {
  if (!startDate || !durationMonths) return null;
  const result = new Date(startDate);
  const targetMonth = result.getMonth() + Number(durationMonths);
  result.setMonth(targetMonth);

  // If setMonth overflowed (e.g. Jan 31 + 1 = Mar 3), clamp to last day of target month
  const expectedMonth = ((new Date(startDate).getMonth() + Number(durationMonths)) % 12 + 12) % 12;
  if (result.getMonth() !== expectedMonth) {
    // Set to day 0 of the overflowed month = last day of previous (target) month
    result.setDate(0);
  }
  return result;
};
