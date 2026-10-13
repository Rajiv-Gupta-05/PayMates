/**
 * Computes a net balance map for a given userId across expenses and settlements.
 *
 * For each expense, it distributes each debtor's debt proportionally
 * to the creditors (people who paid more than their share).
 *
 * @returns { [friendId]: number } — positive = friend owes YOU, negative = YOU owe friend
 */
const computeBalanceMap = (userId, expenses, settlements) => {
  const balanceMap = {};
  const userIdStr = userId.toString();

  expenses.forEach((expense) => {
    // Skip if this user is not involved in this expense
    const userSplit = expense.splits.find((s) => s.user.toString() === userIdStr);
    if (!userSplit) return;

    // Creditors paid MORE than their share (net lenders)
    const creditors = expense.splits.filter((s) => s.amountPaid - s.amountOwed > 0.001);
    // Debtors paid LESS than their share (net borrowers)
    const debtors = expense.splits.filter((s) => s.amountOwed - s.amountPaid > 0.001);

    const totalCredit = creditors.reduce((sum, c) => sum + (c.amountPaid - c.amountOwed), 0);

    debtors.forEach((debtor) => {
      const debtorId = debtor.user.toString();
      const debtorAmount = debtor.amountOwed - debtor.amountPaid;

      creditors.forEach((creditor) => {
        const creditorId = creditor.user.toString();
        const creditorAmount = creditor.amountPaid - creditor.amountOwed;

        // Proportion of this debtor's debt that belongs to this creditor
        const proportion = totalCredit > 0 ? creditorAmount / totalCredit : 0;
        const shareAmount = parseFloat((debtorAmount * proportion).toFixed(2));
        if (shareAmount <= 0.001) return;

        if (debtorId === userIdStr && creditorId !== userIdStr) {
          // User owes creditor
          balanceMap[creditorId] = (balanceMap[creditorId] || 0) - shareAmount;
        } else if (creditorId === userIdStr && debtorId !== userIdStr) {
          // Debtor owes user
          balanceMap[debtorId] = (balanceMap[debtorId] || 0) + shareAmount;
        }
      });
    });
  });

  // Apply settlements to adjust balances
  settlements.forEach((settlement) => {
    const payerId = settlement.payer.toString();
    const payeeId = settlement.payee.toString();
    const amount = settlement.amount;

    if (payerId === userIdStr && payeeId !== userIdStr) {
      // User paid someone — reduces what user owes them
      balanceMap[payeeId] = (balanceMap[payeeId] || 0) + amount;
    } else if (payeeId === userIdStr && payerId !== userIdStr) {
      // Someone paid user — reduces what they owe user
      balanceMap[payerId] = (balanceMap[payerId] || 0) - amount;
    }
  });

  return balanceMap;
};

/**
 * Sums a balance map into totals (youOwe, youAreOwed, totalBalance).
 */
const sumBalances = (balanceMap) => {
  let totalOwe = 0;
  let totalOwedToYou = 0;

  Object.values(balanceMap).forEach((balance) => {
    if (balance > 0.005) totalOwedToYou += balance;
    else if (balance < -0.005) totalOwe += Math.abs(balance);
  });

  return {
    totalOwe: parseFloat(totalOwe.toFixed(2)),
    totalOwedToYou: parseFloat(totalOwedToYou.toFixed(2)),
    totalBalance: parseFloat((totalOwedToYou - totalOwe).toFixed(2)),
  };
};

/**
 * Simplify debts: given a complete group balance map { userId: netBalance },
 * returns the minimum number of transactions to settle all debts.
 * Positive balance = person is owed money. Negative = person owes money.
 */
const simplifyDebts = (groupBalanceMap) => {
  const creditors = []; // people owed money
  const debtors = [];   // people who owe money

  Object.entries(groupBalanceMap).forEach(([id, balance]) => {
    if (balance > 0.01) creditors.push({ id, amount: balance });
    else if (balance < -0.01) debtors.push({ id, amount: Math.abs(balance) });
  });

  const transactions = [];
  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const credit = creditors[i];
    const debt = debtors[j];
    const amount = parseFloat(Math.min(credit.amount, debt.amount).toFixed(2));

    transactions.push({ from: debt.id, to: credit.id, amount });

    credit.amount = parseFloat((credit.amount - amount).toFixed(2));
    debt.amount = parseFloat((debt.amount - amount).toFixed(2));

    if (credit.amount < 0.01) i++;
    if (debt.amount < 0.01) j++;
  }

  return transactions;
};

module.exports = { computeBalanceMap, sumBalances, simplifyDebts };
