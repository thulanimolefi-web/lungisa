// South African banks for payout accounts, with the universal branch codes the dashboard already lists.
export const BANKS = ['Absa', 'African Bank', 'Capitec Bank', 'Discovery Bank', 'FNB', 'Investec', 'Nedbank', 'Old Mutual', 'Sasfin', 'Standard Bank', 'TymeBank', 'Ubank']
export const UNIVERSAL_BRANCH: Record<string, string> = {
  'Absa': '632005', 'Capitec Bank': '470010', 'FNB': '250655', 'Nedbank': '198765', 'Standard Bank': '051001',
  'African Bank': '430000', 'TymeBank': '678910', 'Discovery Bank': '679000',
}
export const ACCOUNT_TYPES: [string, string][] = [['cheque', 'Cheque or current'], ['savings', 'Savings'], ['transmission', 'Transmission']]
