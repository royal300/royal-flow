import { useState, useEffect, useRef } from 'react';
import { GlassCard, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { accountService, settingsService, Income, Expense, PendingExpense, BankDeposit } from '@/lib/storage';
import { Trash2, Download, Pencil, ChevronUp, ChevronDown, FileText, Check, X, TrendingUp, TrendingDown, Landmark, Wallet, AlertCircle, PieChart, Sparkles, Settings, ArrowUpRight, ArrowDownRight, ShieldCheck, DollarSign } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Autocomplete } from '@/components/ui/autocomplete';

const AdminAccountsPage = () => {
  const { toast } = useToast();
  
  // Settings State
  const [clients, setClients] = useState<string[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [banks, setBanks] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  // Settings Inputs
  const [newClient, setNewClient] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [newBank, setNewBank] = useState('');
  const [newCategory, setNewCategory] = useState('');
  
  const [editingSetting, setEditingSetting] = useState<{ key: string, oldValue: string, newValue: string } | null>(null);

  // Data State
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pendingExpenses, setPendingExpenses] = useState<PendingExpense[]>([]);
  const [bankDeposits, setBankDeposits] = useState<BankDeposit[]>([]);

  // Income Form State
  const [incomeForm, setIncomeForm] = useState({ date: '', clientName: '', category: '', paymentMethod: '', bank: '', amount: '', remarks: '', invoicePrefix: 'INV', invoiceNumber: '', rfNo: '', chequeNo: '', isGst: false });
  
  // Expense Form State
  const [expenseForm, setExpenseForm] = useState({ date: '', category: '', bank: '', clientName: '', paymentMethod: '', amount: '', remarks: '', rfNo: '', isGst: false });

  // Bank Deposit Form State
  const [bankDepositForm, setBankDepositForm] = useState({ date: '', type: 'Cash', bank: '', amount: '', chequeNo: '', bankName: '', remarks: '' });

  // Input Refs for Settings
  const clientInputRef = useRef<HTMLInputElement>(null);
  const paymentMethodInputRef = useRef<HTMLInputElement>(null);
  const bankInputRef = useRef<HTMLInputElement>(null);
  const categoryInputRef = useRef<HTMLInputElement>(null);

  // PDF Preview State
  const [pdfPreviewData, setPdfPreviewData] = useState<{ title: string, headers: string[], tableData: any[][] } | null>(null);

  // Date Formatter
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  // Edit Modals State
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingPendingExpense, setEditingPendingExpense] = useState<PendingExpense | null>(null);
  const [editingBankDeposit, setEditingBankDeposit] = useState<BankDeposit | null>(null);

  // Form Collapse States
  const [showIncomeForm, setShowIncomeForm] = useState(true);
  const [showExpenseForm, setShowExpenseForm] = useState(true);
  const [showBankDepositForm, setShowBankDepositForm] = useState(true);

  // Filters
  const [incomeFilters, setIncomeFilters] = useState({ clientName: 'All', category: 'All', paymentMethod: 'All', bank: 'All', month: 'All', year: 'All', invoiceNumber: '', startDate: '', endDate: '' });
  const [expenseFilters, setExpenseFilters] = useState({ category: 'All', clientName: 'All', month: 'All', year: 'All', startDate: '', endDate: '' });
  const [adExpenseFilters, setAdExpenseFilters] = useState({ clientName: 'All', month: 'All', year: 'All' });
  const [bankDepositFilters, setBankDepositFilters] = useState({ type: 'All', month: 'All', year: 'All', startDate: '', endDate: '' });
  const [overviewFilters, setOverviewFilters] = useState({ month: 'All', year: 'All' });
  const [ledgerFilters, setLedgerFilters] = useState({ clientName: 'All', month: 'All', year: 'All' });

  const loadData = async () => {
    try {
      const [
        clientsData, methodsData, banksData, categoriesData,
        incomesData, expensesData, bankDepositsData, pendingExpensesData
      ] = await Promise.all([
        settingsService.get('accountClients'),
        settingsService.get('accountPaymentMethods'),
        settingsService.get('accountBanks'),
        settingsService.get('accountCategories'),
        accountService.getIncomes(),
        accountService.getExpenses(),
        accountService.getBankDeposits(),
        accountService.getPendingExpenses()
      ]);

      setClients(clientsData?.value || []);
      setPaymentMethods(methodsData?.value || []);
      setBanks(banksData?.value || []);
      
      const loadedCats = categoriesData?.value || [];
      const expCats = (expensesData || []).map(e => e.category).filter(Boolean);
      setCategories(Array.from(new Set(['Meta Ad', ...loadedCats, ...expCats])));
      
      setIncomes(incomesData || []);
      setExpenses(expensesData || []);
      setPendingExpenses(pendingExpensesData || []);
      setBankDeposits(bankDepositsData || []);
    } catch (error) {
      console.error('Failed to load accounts data', error);
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handlers for Settings
  const handleAddSetting = async (key: string, value: string, list: string[], setList: (val: string[]) => void, resetInput: () => void, inputRef?: React.RefObject<HTMLInputElement>) => {
    if (!value.trim() || list.includes(value.trim())) return;
    const newList = [...list, value.trim()];
    try {
      await settingsService.update(key, newList);
      setList(newList);
      resetInput();
      toast({ title: 'Added successfully' });
      if (inputRef && inputRef.current) {
        inputRef.current.focus();
      }
    } catch (e) {
      toast({ title: 'Error adding item', variant: 'destructive' });
    }
  };

  const handleRemoveSetting = async (key: string, valueToRemove: string, list: string[], setList: (val: string[]) => void) => {
    const newList = list.filter(item => item !== valueToRemove);
    try {
      await settingsService.update(key, newList);
      setList(newList);
      toast({ title: 'Removed successfully' });
    } catch (e) {
      toast({ title: 'Error removing item', variant: 'destructive' });
    }
  };

  const handleEditSetting = async (key: string, oldValue: string, newValue: string, list: string[], setList: (val: string[]) => void) => {
    if (!newValue.trim() || newValue.trim() === oldValue) return setEditingSetting(null);
    if (list.includes(newValue.trim())) {
      toast({ title: 'Item already exists', variant: 'destructive' });
      return;
    }
    const newList = list.map(item => item === oldValue ? newValue.trim() : item);
    try {
      await settingsService.update(key, newList);
      setList(newList);
      toast({ title: 'Updated successfully' });
      setEditingSetting(null);
    } catch (e) {
      toast({ title: 'Error updating item', variant: 'destructive' });
    }
  };

  // Handlers for Forms
  const handleAddIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incomeForm.date || !incomeForm.clientName || !incomeForm.paymentMethod || !incomeForm.bank || !incomeForm.amount) {
      return toast({ title: 'Please fill all fields', variant: 'destructive' });
    }

    const dateObj = new Date(incomeForm.date);
    const month = dateObj.toLocaleString('default', { month: 'long' });
    const year = dateObj.getFullYear().toString();

    const amountVal = Number(incomeForm.amount);
    const withoutGstVal = incomeForm.isGst ? Number((amountVal / 1.18).toFixed(2)) : amountVal;
    const gstVal = incomeForm.isGst ? Number((amountVal - withoutGstVal).toFixed(2)) : 0;

    try {
      await accountService.createIncome({
        date: incomeForm.date,
        clientName: incomeForm.clientName,
        category: incomeForm.category,
        paymentMethod: incomeForm.paymentMethod,
        bank: incomeForm.bank,
        amount: amountVal,
        isGst: incomeForm.isGst,
        gstAmount: gstVal,
        withoutGstAmount: withoutGstVal,
        month,
        year,
        remarks: incomeForm.remarks,
        invoiceNumber: incomeForm.invoiceNumber.trim() ? `${incomeForm.invoicePrefix}-${incomeForm.invoiceNumber.trim().replace(/^(INV|PFI)-/i, '')}` : '',
        rfNo: incomeForm.rfNo || undefined,
        chequeNo: incomeForm.chequeNo.trim() || undefined
      });
      toast({ title: 'Income added successfully' });
      setIncomeForm({ date: '', clientName: '', category: '', paymentMethod: '', bank: '', amount: '', remarks: '', invoicePrefix: 'INV', invoiceNumber: '', rfNo: '', chequeNo: '', isGst: false });
      loadData();
    } catch (err) {
      toast({ title: 'Failed to add income', variant: 'destructive' });
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.date || !expenseForm.category || !expenseForm.amount) {
      return toast({ title: 'Please fill all fields', variant: 'destructive' });
    }

    const dateObj = new Date(expenseForm.date);
    const month = dateObj.toLocaleString('default', { month: 'long' });
    const year = dateObj.getFullYear().toString();

    const amountVal = Number(expenseForm.amount);
    const withoutGstVal = expenseForm.isGst ? Number((amountVal / 1.18).toFixed(2)) : amountVal;
    const gstVal = expenseForm.isGst ? Number((amountVal - withoutGstVal).toFixed(2)) : 0;

    try {
      await accountService.createExpense({
        date: expenseForm.date,
        category: expenseForm.category,
        paymentMethod: expenseForm.paymentMethod || undefined,
        bank: expenseForm.bank,
        clientName: expenseForm.clientName || undefined,
        rfNo: expenseForm.rfNo || undefined,
        amount: amountVal,
        isGst: expenseForm.isGst,
        gstAmount: gstVal,
        withoutGstAmount: withoutGstVal,
        month,
        year,
        remarks: expenseForm.remarks
      });
      toast({ title: 'Expense added successfully' });
      setExpenseForm({ date: '', category: '', bank: '', clientName: '', paymentMethod: '', amount: '', remarks: '', rfNo: '', isGst: false });
      loadData();
    } catch (err) {
      toast({ title: 'Failed to add expense', variant: 'destructive' });
    }
  };

  const handleAddBankDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dateObj = new Date(bankDepositForm.date);
    const month = dateObj.toLocaleString('default', { month: 'long' });
    const year = dateObj.getFullYear().toString();

    try {
      await accountService.createBankDeposit({
        date: bankDepositForm.date,
        type: bankDepositForm.type as 'Cash' | 'Cheque',
        bank: bankDepositForm.bank,
        amount: Number(bankDepositForm.amount),
        chequeNo: bankDepositForm.chequeNo,
        bankName: bankDepositForm.bankName,
        month,
        year,
        remarks: bankDepositForm.remarks
      });
      toast({ title: 'Bank Deposit added successfully' });
      setBankDepositForm({ date: '', type: 'Cash', bank: '', amount: '', chequeNo: '', bankName: '', remarks: '' });
      loadData();
    } catch (err) {
      toast({ title: 'Failed to add bank deposit', variant: 'destructive' });
    }
  };

  const handleDeleteIncome = async (id: string) => {
    try {
      await accountService.deleteIncome(id);
      toast({ title: 'Deleted successfully' });
      loadData();
    } catch (err) {
      toast({ title: 'Error deleting', variant: 'destructive' });
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await accountService.deleteExpense(id);
      toast({ title: 'Deleted successfully' });
      loadData();
    } catch (err) {
      toast({ title: 'Error deleting', variant: 'destructive' });
    }
  };

  const handleDeleteBankDeposit = async (id: string) => {
    try {
      await accountService.deleteBankDeposit(id);
      toast({ title: 'Deleted successfully' });
      loadData();
    } catch (err) {
      toast({ title: 'Error deleting', variant: 'destructive' });
    }
  };

  const handleUpdateIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIncome) return;
    try {
      const amountVal = Number(editingIncome.amount);
      const withoutGstVal = editingIncome.isGst ? Number((amountVal / 1.18).toFixed(2)) : amountVal;
      const gstVal = editingIncome.isGst ? Number((amountVal - withoutGstVal).toFixed(2)) : 0;
      const updatedData = {
        ...editingIncome,
        amount: amountVal,
        gstAmount: gstVal,
        withoutGstAmount: withoutGstVal
      };
      await accountService.updateIncome(editingIncome.id, updatedData);
      toast({ title: 'Income updated successfully' });
      setEditingIncome(null);
      loadData();
    } catch (err) {
      toast({ title: 'Failed to update', variant: 'destructive' });
    }
  };

  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    try {
      const amountVal = Number(editingExpense.amount);
      const withoutGstVal = editingExpense.isGst ? Number((amountVal / 1.18).toFixed(2)) : amountVal;
      const gstVal = editingExpense.isGst ? Number((amountVal - withoutGstVal).toFixed(2)) : 0;
      const updatedData = {
        ...editingExpense,
        amount: amountVal,
        gstAmount: gstVal,
        withoutGstAmount: withoutGstVal
      };
      await accountService.updateExpense(editingExpense.id, updatedData);
      toast({ title: 'Expense updated successfully' });
      setEditingExpense(null);
      loadData();
    } catch (err) {
      toast({ title: 'Failed to update', variant: 'destructive' });
    }
  };

  const handleUpdateBankDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBankDeposit) return;
    try {
      await accountService.updateBankDeposit(editingBankDeposit.id, editingBankDeposit);
      toast({ title: 'Bank Deposit updated successfully' });
      setEditingBankDeposit(null);
      loadData();
    } catch (err) {
      toast({ title: 'Failed to update', variant: 'destructive' });
    }
  };

  const handleApproveAllPendingExpenses = async () => {
    if (pendingExpenses.length === 0) return;
    if (!confirm(`Are you sure you want to approve all ${pendingExpenses.length} pending expenses and move them to main expenses?`)) return;
    try {
      const result = await accountService.approveAllPendingExpenses();
      toast({ title: 'Success', description: `All ${result.count || pendingExpenses.length} pending expenses approved and moved to main expenses.` });
      loadData();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to approve pending expenses', variant: 'destructive' });
    }
  };

  const handleApprovePendingExpense = async (id: string) => {
    try {
      await accountService.approvePendingExpense(id);
      toast({ title: 'Success', description: 'Pending expense approved and moved to main accounts.' });
      loadData();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to approve pending expense', variant: 'destructive' });
    }
  };

  const handleDeletePendingExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pending expense?')) return;
    try {
      await accountService.deletePendingExpense(id);
      toast({ title: 'Pending expense deleted successfully' });
      loadData();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete pending expense', variant: 'destructive' });
    }
  };

  const handleUpdatePendingExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPendingExpense) return;
    try {
      const amountVal = Number(editingPendingExpense.amount);
      const withoutGstVal = editingPendingExpense.isGst ? Number((amountVal / 1.18).toFixed(2)) : amountVal;
      const gstVal = editingPendingExpense.isGst ? Number((amountVal - withoutGstVal).toFixed(2)) : 0;

      const dateObj = new Date(editingPendingExpense.date);
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const month = !isNaN(dateObj.getMonth()) ? monthNames[dateObj.getMonth()] : editingPendingExpense.month;
      const year = !isNaN(dateObj.getFullYear()) ? dateObj.getFullYear().toString() : editingPendingExpense.year;

      await accountService.updatePendingExpense(editingPendingExpense.id, {
        ...editingPendingExpense,
        amount: amountVal,
        withoutGstAmount: withoutGstVal,
        gstAmount: gstVal,
        month,
        year
      });
      toast({ title: 'Pending expense updated successfully' });
      setEditingPendingExpense(null);
      loadData();
    } catch (err) {
      toast({ title: 'Failed to update pending expense', variant: 'destructive' });
    }
  };

  const getRecordMonth = (dateStr?: string, storedMonth?: string) => {
    if (storedMonth && storedMonth.trim()) return storedMonth.trim();
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return '';
    return dateObj.toLocaleString('default', { month: 'long' });
  };

  const getRecordYear = (dateStr?: string, storedYear?: string | number) => {
    if (storedYear && storedYear.toString().trim()) return storedYear.toString().trim();
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return '';
    return dateObj.getFullYear().toString();
  };

  const isDateInRange = (dateStr: string, startStr: string, endStr: string) => {
    if (!startStr && !endStr) return true;
    if (!dateStr) return false;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;
    if (startStr) {
      const start = new Date(`${startStr}T00:00:00`);
      if (date < start) return false;
    }
    if (endStr) {
      const end = new Date(`${endStr}T23:59:59.999`);
      if (date > end) return false;
    }
    return true;
  };

  const filteredIncomes = incomes.filter(inc => {
    const recMonth = getRecordMonth(inc.date, inc.month);
    const recYear = getRecordYear(inc.date, inc.year);
    const matchInvoice = !incomeFilters.invoiceNumber || (inc.invoiceNumber && inc.invoiceNumber.toLowerCase().includes(incomeFilters.invoiceNumber.toLowerCase()));
    const matchDateRange = isDateInRange(inc.date, incomeFilters.startDate, incomeFilters.endDate);
    const matchClient = incomeFilters.clientName === 'All' || !incomeFilters.clientName || (inc.clientName && inc.clientName.toLowerCase().includes(incomeFilters.clientName.toLowerCase()));
    const matchCategory = incomeFilters.category === 'All' || !incomeFilters.category || (inc.category && inc.category.toLowerCase().includes(incomeFilters.category.toLowerCase()));
    const matchPayment = incomeFilters.paymentMethod === 'All' || !incomeFilters.paymentMethod || (inc.paymentMethod && inc.paymentMethod.toLowerCase().includes(incomeFilters.paymentMethod.toLowerCase()));
    const matchBank = incomeFilters.bank === 'All' || !incomeFilters.bank || (inc.bank && inc.bank.toLowerCase().includes(incomeFilters.bank.toLowerCase()));
    const matchMonth = incomeFilters.month === 'All' || !incomeFilters.month || recMonth.toLowerCase() === incomeFilters.month.toLowerCase() || recMonth.toLowerCase().includes(incomeFilters.month.toLowerCase());
    const matchYear = incomeFilters.year === 'All' || !incomeFilters.year || recYear.toLowerCase() === incomeFilters.year.toString().toLowerCase() || recYear.toLowerCase().includes(incomeFilters.year.toString().toLowerCase());
    return matchDateRange && matchClient && matchCategory && matchPayment && matchBank && matchMonth && matchYear && matchInvoice;
  });

  const isMetaAd = (category?: string) => {
    if (!category) return false;
    const lower = category.toLowerCase().trim();
    return lower === 'meta ad' || lower === 'meta ads' || lower.includes('meta ad');
  };

  const filteredExpenses = expenses.filter(exp => {
    const recMonth = getRecordMonth(exp.date, exp.month);
    const recYear = getRecordYear(exp.date, exp.year);
    const matchDateRange = isDateInRange(exp.date, expenseFilters.startDate, expenseFilters.endDate);
    const matchCategory = expenseFilters.category === 'All' || !expenseFilters.category || (exp.category && exp.category.toLowerCase().includes(expenseFilters.category.toLowerCase()));
    const matchClient = expenseFilters.clientName === 'All' || !expenseFilters.clientName || (exp.clientName && exp.clientName.toLowerCase().includes(expenseFilters.clientName.toLowerCase()));
    const matchMonth = expenseFilters.month === 'All' || !expenseFilters.month || recMonth.toLowerCase() === expenseFilters.month.toLowerCase() || recMonth.toLowerCase().includes(expenseFilters.month.toLowerCase());
    const matchYear = expenseFilters.year === 'All' || !expenseFilters.year || recYear.toLowerCase() === expenseFilters.year.toString().toLowerCase() || recYear.toLowerCase().includes(expenseFilters.year.toString().toLowerCase());
    return matchDateRange && matchCategory && matchClient && matchMonth && matchYear;
  });

  const filteredAdExpenses = expenses.filter(exp => {
    if (!isMetaAd(exp.category)) return false;
    const recMonth = getRecordMonth(exp.date, exp.month);
    const recYear = getRecordYear(exp.date, exp.year);
    const matchClient = adExpenseFilters.clientName === 'All' || !adExpenseFilters.clientName || (exp.clientName && exp.clientName.toLowerCase().includes(adExpenseFilters.clientName.toLowerCase()));
    const matchMonth = adExpenseFilters.month === 'All' || !adExpenseFilters.month || recMonth.toLowerCase() === adExpenseFilters.month.toLowerCase() || recMonth.toLowerCase().includes(adExpenseFilters.month.toLowerCase());
    const matchYear = adExpenseFilters.year === 'All' || !adExpenseFilters.year || recYear.toLowerCase() === adExpenseFilters.year.toString().toLowerCase() || recYear.toLowerCase().includes(adExpenseFilters.year.toString().toLowerCase());
    return matchClient && matchMonth && matchYear;
  });

  const filteredBankDeposits = bankDeposits.filter(dep => {
    const recMonth = getRecordMonth(dep.date, dep.month);
    const recYear = getRecordYear(dep.date, dep.year);
    const matchDateRange = isDateInRange(dep.date, bankDepositFilters.startDate, bankDepositFilters.endDate);
    const matchType = bankDepositFilters.type === 'All' || !bankDepositFilters.type || (dep.type && dep.type.toLowerCase().includes(bankDepositFilters.type.toLowerCase()));
    const matchMonth = bankDepositFilters.month === 'All' || !bankDepositFilters.month || recMonth.toLowerCase() === bankDepositFilters.month.toLowerCase() || recMonth.toLowerCase().includes(bankDepositFilters.month.toLowerCase());
    const matchYear = bankDepositFilters.year === 'All' || !bankDepositFilters.year || recYear.toLowerCase() === bankDepositFilters.year.toString().toLowerCase() || recYear.toLowerCase().includes(bankDepositFilters.year.toString().toLowerCase());
    return matchDateRange && matchType && matchMonth && matchYear;
  });

  // Combined Ledger Entries
  const ledgerEntries = [
    ...incomes.map(inc => ({
      id: inc.id,
      date: inc.date || '',
      clientName: inc.clientName || '-',
      category: inc.category || '-',
      amount: Number(inc.amount) || 0,
      gstAmount: Number(inc.gstAmount) || 0,
      remarks: inc.remarks || '-',
      type: 'Income' as const,
      month: getRecordMonth(inc.date, inc.month),
      year: getRecordYear(inc.date, inc.year)
    })),
    ...expenses.map(exp => ({
      id: exp.id,
      date: exp.date || '',
      clientName: exp.clientName || '-',
      category: exp.category || '-',
      amount: Number(exp.amount) || 0,
      gstAmount: Number(exp.gstAmount) || 0,
      remarks: exp.remarks || '-',
      type: 'Expense' as const,
      month: getRecordMonth(exp.date, exp.month),
      year: getRecordYear(exp.date, exp.year)
    }))
  ].filter(entry => {
    const matchClient = ledgerFilters.clientName === 'All' || !ledgerFilters.clientName || (entry.clientName && entry.clientName.toLowerCase().includes(ledgerFilters.clientName.toLowerCase()));
    const matchMonth = ledgerFilters.month === 'All' || !ledgerFilters.month || (entry.month && entry.month.toLowerCase().includes(ledgerFilters.month.toLowerCase()));
    const matchYear = ledgerFilters.year === 'All' || !ledgerFilters.year || (entry.year && entry.year.toString().toLowerCase().includes(ledgerFilters.year.toString().toLowerCase()));
    return matchClient && matchMonth && matchYear;
  }).sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  const totalLedgerIncome = ledgerEntries.filter(e => e.type === 'Income').reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalLedgerIncomeGst = ledgerEntries.filter(e => e.type === 'Income').reduce((sum, e) => sum + (e.gstAmount || 0), 0);
  const totalLedgerExpense = ledgerEntries.filter(e => e.type === 'Expense').reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalLedgerExpenseGst = ledgerEntries.filter(e => e.type === 'Expense').reduce((sum, e) => sum + (e.gstAmount || 0), 0);

  // Overview Totals
  const overviewIncomes = incomes.filter(inc => {
    const recMonth = getRecordMonth(inc.date, inc.month);
    const recYear = getRecordYear(inc.date, inc.year);
    return (overviewFilters.month === 'All' || recMonth === overviewFilters.month) &&
      (overviewFilters.year === 'All' || recYear === overviewFilters.year);
  });
  const overviewExpenses = expenses.filter(exp => {
    const recMonth = getRecordMonth(exp.date, exp.month);
    const recYear = getRecordYear(exp.date, exp.year);
    return (overviewFilters.month === 'All' || recMonth === overviewFilters.month) &&
      (overviewFilters.year === 'All' || recYear === overviewFilters.year);
  });
  const overviewDeposits = bankDeposits.filter(dep => {
    const recMonth = getRecordMonth(dep.date, dep.month);
    const recYear = getRecordYear(dep.date, dep.year);
    return (overviewFilters.month === 'All' || recMonth === overviewFilters.month) &&
      (overviewFilters.year === 'All' || recYear === overviewFilters.year);
  });

  const totalOverviewIncome = overviewIncomes.reduce((sum, item) => sum + item.amount, 0);
  const totalOverviewExpense = overviewExpenses.reduce((sum, item) => sum + item.amount, 0);
  const totalOverviewAdExpense = overviewExpenses.filter(item => item.category?.toLowerCase() === 'meta ad').reduce((sum, item) => sum + item.amount, 0);
  const totalOverviewDeposit = overviewDeposits.reduce((sum, item) => sum + item.amount, 0);
  const totalOverviewBalance = totalOverviewIncome - totalOverviewExpense;

  const totalCashIncome = overviewIncomes.filter(inc => inc.paymentMethod?.toLowerCase().includes('cash')).reduce((sum, item) => sum + item.amount, 0);
  const totalInHand = totalCashIncome - totalOverviewDeposit;

  const totalIncome = filteredIncomes.reduce((acc, curr) => acc + curr.amount, 0);
  const totalIncomeGst = filteredIncomes.reduce((acc, curr) => acc + (curr.gstAmount || 0), 0);
  const totalExpense = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpenseGst = filteredExpenses.reduce((acc, curr) => acc + (curr.gstAmount || 0), 0);
  const totalAdExpense = filteredAdExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalAdExpenseGst = filteredAdExpenses.reduce((acc, curr) => acc + (curr.gstAmount || 0), 0);
  const totalBankDeposit = filteredBankDeposits.reduce((acc, curr) => acc + curr.amount, 0);

  const handleExportAdExpensePDF = () => {
    try {
      if (filteredAdExpenses.length === 0) {
        return toast({ title: 'No Ad Expense records to export' });
      }
      const doc = new jsPDF('landscape');
      doc.setFontSize(16);
      doc.text('Ad Expense Records', 14, 15);
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

      const headers = [['Submitted By', 'Date', 'Client Name', 'Category', 'Payment Mode', 'Bank', 'Ref No.', 'Remarks', 'Amount', 'GST']];
      const tableData = filteredAdExpenses.map(item => [
        item.staffName || '-',
        formatDate(item.date) || '-',
        item.clientName || '-',
        item.category || '-',
        item.paymentMethod || '-',
        item.bank || '-',
        item.rfNo || '-',
        item.remarks || '-',
        `Rs. ${item.amount?.toLocaleString('en-IN') || '0'}`,
        item.isGst ? `Rs. ${item.gstAmount?.toLocaleString('en-IN') || '0'}` : '-'
      ]);

      autoTable(doc, {
        head: headers,
        body: tableData,
        startY: 28,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [63, 81, 181] }
      });

      const fileName = `ad_expense_records_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      toast({ title: 'Ad Expense PDF exported successfully' });
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast({ title: 'Failed to export PDF', variant: 'destructive' });
    }
  };

  const handlePreviewPDF = (data: any[], title: string) => {
    if (data.length === 0) return toast({ title: 'No data to download' });
    let headers: string[] = [];
    let tableData: any[][] = [];

    if (title === 'Income Records') {
      headers = ['Date', 'Client Name', 'Category', 'Mode of Payment', 'Deposited Bank', 'Ref No.', 'Month', 'Year', 'Invoice No.', 'Remarks', 'Amount', 'GST'];
      tableData = data.map(row => [
        formatDate(row.date), row.clientName, row.category || '-', row.paymentMethod && row.paymentMethod.toLowerCase() === 'cheque' && row.chequeNo ? `Cheque\nNo. : ${row.chequeNo}` : row.paymentMethod, row.bank, row.rfNo || '-', row.month, row.year, row.invoiceNumber || '-', row.remarks || '-', row.amount, row.gstAmount ? `₹${row.gstAmount}` : '-'
      ]);
    } else if (title === 'Expense Records') {
      headers = ['Submitted By', 'Date', 'Client Name', 'Category', 'Bank', 'Ref No.', 'Month', 'Year', 'Remarks', 'Amount', 'GST'];
      tableData = data.map(row => [
        row.staffName || '-', formatDate(row.date), row.clientName || '-', row.category, row.bank || '-', row.rfNo || '-', row.month, row.year, row.remarks || '-', row.amount, row.gstAmount ? `₹${row.gstAmount}` : '-'
      ]);
    } else if (title === 'Bank Deposits') {
      headers = ['Date', 'Deposited Bank', 'Type', 'Cheque Details', 'Month', 'Year', 'Remarks', 'Amount'];
      tableData = data.map(row => [
        formatDate(row.date), row.bank || '-', row.type, row.type === 'Cheque' ? `${row.chequeNo} (${row.bankName})` : '-', row.month, row.year, row.remarks || '-', row.amount
      ]);
    } else if (title === 'Client Ledger Records') {
      headers = ['Date', 'Type', 'Client Name', 'Category', 'Remarks', 'Amount', 'GST'];
      tableData = data.map(row => [
        formatDate(row.date), row.type, row.clientName, row.category, row.remarks, row.amount, row.gstAmount ? `₹${row.gstAmount}` : '-'
      ]);
    } else if (title === 'Ad Expense Records') {
      headers = ['Submitted By', 'Date', 'Client Name', 'Category', 'Payment Mode', 'Bank', 'Ref No.', 'Remarks', 'Amount', 'GST'];
      tableData = data.map(row => [
        row.staffName || '-', formatDate(row.date), row.clientName || '-', row.category || '-', row.paymentMethod || '-', row.bank || '-', row.rfNo || '-', row.remarks || '-', row.amount, row.gstAmount ? `₹${row.gstAmount}` : '-'
      ]);
    }

    setPdfPreviewData({ title, headers, tableData });
  };

  const downloadGeneratedPDF = () => {
    if (!pdfPreviewData) return;
    const doc = new jsPDF('landscape');
    doc.text(pdfPreviewData.title, 14, 15);
    autoTable(doc, {
      head: [pdfPreviewData.headers],
      body: pdfPreviewData.tableData,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [22, 160, 133] }
    });
    doc.save(`${pdfPreviewData.title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    setPdfPreviewData(null);
  };

  const getUniqueValues = (data: any[], key: string) => {
    return Array.from(new Set(data.map(item => {
      if (key === 'month') return getRecordMonth(item.date, item.month);
      if (key === 'year') return getRecordYear(item.date, item.year);
      return item[key];
    }).filter(v => v !== undefined && v !== null && v !== ''))).sort();
  };

  return (
    <div className="space-y-8 animate-fade-up pb-12">
      {/* Executive Financial Dashboard Header Bar */}
      <div className="bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-slate-900/90 backdrop-blur-2xl border border-amber-500/20 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/40 flex items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.2)] shrink-0 group">
              <Landmark className="w-8 h-8 text-amber-400 group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white flex items-center gap-2">
                  Royal 300 <span className="text-gradient-gold">Finance Pro</span>
                </h1>
                <span className="executive-badge bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Ledger Sync
                </span>
              </div>
              <p className="text-sm md:text-base text-slate-300 mt-1 font-medium">
                Executive Control Center • Real-time synthesis of revenue inflow, campaign expenditure, and liquid assets.
              </p>
            </div>
          </div>

          {/* Global Executive Date Filter & Status */}
          <div className="flex items-center gap-3 bg-slate-950/60 backdrop-blur-xl border border-white/10 p-2 rounded-2xl shadow-inner w-full md:w-auto">
            <div className="w-[140px]">
              <Autocomplete
                value={overviewFilters.month === 'All' ? '' : overviewFilters.month}
                onChange={v => setOverviewFilters({ ...overviewFilters, month: v || 'All' })}
                suggestions={['All', ...Array.from(new Set(getUniqueValues([...incomes, ...expenses, ...bankDeposits], 'month').filter(Boolean))).map(String)]}
                placeholder="All Months"
              />
            </div>
            <div className="w-[120px]">
              <Autocomplete
                value={overviewFilters.year === 'All' ? '' : overviewFilters.year}
                onChange={v => setOverviewFilters({ ...overviewFilters, year: v || 'All' })}
                suggestions={['All', ...Array.from(new Set(getUniqueValues([...incomes, ...expenses, ...bankDeposits], 'year').filter(Boolean))).map(String)]}
                placeholder="All Years"
              />
            </div>
            {(overviewFilters.month !== 'All' || overviewFilters.year !== 'All') && (
              <Button size="sm" variant="ghost" onClick={() => setOverviewFilters({ month: 'All', year: 'All' })} className="h-8 px-2 text-xs text-amber-400 hover:bg-amber-500/10">
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 5-Card Luminous KPI Dashboard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {/* KPI 1: Total Income */}
        <div className="executive-card bg-gradient-to-br from-slate-900/95 to-slate-900/70 border-emerald-500/30 p-5 relative overflow-hidden group hover:border-emerald-500/60">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 group-hover:text-emerald-400 transition-colors">Total Income</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black font-mono text-white tracking-tight mb-2">
            ₹{totalOverviewIncome.toLocaleString()}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
              <ArrowUpRight className="w-3.5 h-3.5" /> Gross Inflow
            </span>
            <span className="text-slate-400 font-mono">{overviewIncomes.length} txns</span>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500/70 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* KPI 2: Total Expense */}
        <div className="executive-card bg-gradient-to-br from-slate-900/95 to-slate-900/70 border-rose-500/30 p-5 relative overflow-hidden group hover:border-rose-500/60">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 group-hover:text-rose-400 transition-colors">Total Expense</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black font-mono text-white tracking-tight mb-2">
            ₹{totalOverviewExpense.toLocaleString()}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1 text-rose-400 font-semibold">
              <ArrowDownRight className="w-3.5 h-3.5" /> Gross Outflow
            </span>
            <span className="text-slate-400 font-mono">{overviewExpenses.length} txns</span>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500/0 via-rose-500/70 to-rose-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* KPI 3: Net Balance / Liquid Assets */}
        <div className="executive-card bg-gradient-to-br from-slate-900/95 to-slate-900/70 border-amber-500/40 p-5 relative overflow-hidden group hover:border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.12)]">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-bold font-mono uppercase tracking-wider text-amber-400">Net Balance</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl lg:text-3xl font-black font-mono tracking-tight mb-2 ${totalOverviewBalance >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
            ₹{totalOverviewBalance.toLocaleString()}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[11px] font-semibold">
              In Hand: ₹{totalInHand.toLocaleString()}
            </span>
            <span className="text-slate-400 text-[11px]">Liquid Reserve</span>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500/0 via-amber-500 to-amber-500/0" />
        </div>

        {/* KPI 4: Meta Ad Expense */}
        <div className="executive-card bg-gradient-to-br from-slate-900/95 to-slate-900/70 border-cyan-500/30 p-5 relative overflow-hidden group hover:border-cyan-500/60">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 group-hover:text-cyan-400 transition-colors">Meta Ad Expense</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black font-mono text-white tracking-tight mb-2">
            ₹{totalOverviewAdExpense.toLocaleString()}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1 text-cyan-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" /> Campaign Outflow
            </span>
            <span className="text-slate-400 font-mono font-medium">Meta FB/IG</span>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500/70 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* KPI 5: Pending Staff Approvals */}
        <div className={`executive-card bg-gradient-to-br from-slate-900/95 to-slate-900/70 p-5 relative overflow-hidden group transition-all duration-300 ${pendingExpenses.length > 0 ? 'border-amber-500/50 shadow-[0_0_18px_rgba(245,158,11,0.18)]' : 'border-purple-500/30 hover:border-purple-500/60'}`}>
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 group-hover:text-purple-400 transition-colors">Pending Approvals</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${pendingExpenses.length > 0 ? 'bg-amber-500 text-slate-950 shadow-md' : 'bg-purple-500/10 border border-purple-500/20 text-purple-400'}`}>
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black font-mono text-white tracking-tight mb-2">
            {pendingExpenses.length}
          </div>
          <div className="flex items-center justify-between text-xs">
            {pendingExpenses.length > 0 ? (
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[11px] font-bold animate-pulse">
                Action Required
              </span>
            ) : (
              <span className="text-emerald-400 font-semibold">All Approved</span>
            )}
            <span className="text-slate-400 text-[11px]">Staff Portal Queue</span>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500/0 via-purple-500/70 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <Tabs defaultValue="income" className="w-full">
        {/* Sleek Glassmorphic Pill Navigation */}
        <TabsList className="flex flex-wrap items-center justify-start gap-2 bg-slate-900/80 backdrop-blur-2xl border border-white/10 p-2 rounded-2xl shadow-xl w-full h-auto mb-6">
          <TabsTrigger value="overview" className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-yellow-500 data-[state=active]:text-slate-950 data-[state=active]:font-bold data-[state=active]:shadow-lg">
            <PieChart className="w-4 h-4" /> Executive Overview
          </TabsTrigger>
          <TabsTrigger value="income" className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-400 data-[state=active]:text-slate-950 data-[state=active]:font-bold data-[state=active]:shadow-lg">
            <TrendingUp className="w-4 h-4" /> Income
          </TabsTrigger>
          <TabsTrigger value="expense" className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-500 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:shadow-lg">
            <TrendingDown className="w-4 h-4" /> Expense
          </TabsTrigger>
          <TabsTrigger value="ad-expense" className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-slate-950 data-[state=active]:font-bold data-[state=active]:shadow-lg">
            <Sparkles className="w-4 h-4" /> Ad Expense (Meta Ad)
          </TabsTrigger>
          <TabsTrigger value="bank-deposit" className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:shadow-lg">
            <Landmark className="w-4 h-4" /> Bank Deposit
          </TabsTrigger>
          <TabsTrigger value="ledger" className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:shadow-lg">
            <FileText className="w-4 h-4" /> Client Ledger
          </TabsTrigger>
          <TabsTrigger value="pending-expense" className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-slate-950 data-[state=active]:font-bold data-[state=active]:shadow-lg">
            <AlertCircle className="w-4 h-4" /> Pending Expense
            {pendingExpenses.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-950 text-amber-400 font-extrabold shadow-inner ml-1">
                {pendingExpenses.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-700 data-[state=active]:to-slate-800 data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:shadow-lg">
            <Settings className="w-4 h-4" /> Settings & Master Data
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          <GlassCard className="bg-slate-900/90 border-white/10 shadow-2xl">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-white/10">
              <div>
                <CardTitle className="text-2xl font-extrabold text-white flex items-center gap-3">
                  Executive Financial Pulse
                  <span className="executive-badge bg-amber-500/15 text-amber-400 border-amber-500/30">
                    {overviewFilters.month === 'All' ? 'Full Period' : `${overviewFilters.month} ${overviewFilters.year === 'All' ? '' : overviewFilters.year}`}
                  </span>
                </CardTitle>
                <CardDescription className="text-slate-400 mt-1">Detailed synthesis of accounts balance and cash flow.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-emerald-950/40 p-6 rounded-2xl border border-emerald-500/30 flex flex-col items-center justify-center relative overflow-hidden shadow-lg group hover:border-emerald-500/60 transition-all">
                  <span className="text-emerald-400 text-xs font-bold font-mono uppercase tracking-widest mb-2">Total Gross Income</span>
                  <span className="text-4xl font-black text-emerald-300 font-mono">₹{totalOverviewIncome.toLocaleString()}</span>
                  <span className="text-[11px] text-emerald-500 mt-2 font-semibold">100% Invoiced Revenue</span>
                </div>
                <div className="bg-rose-950/40 p-6 rounded-2xl border border-rose-500/30 flex flex-col items-center justify-center relative overflow-hidden shadow-lg group hover:border-rose-500/60 transition-all">
                  <span className="text-rose-400 text-xs font-bold font-mono uppercase tracking-widest mb-2">Total Gross Expense</span>
                  <span className="text-4xl font-black text-rose-300 font-mono">₹{totalOverviewExpense.toLocaleString()}</span>
                  <span className="text-[11px] text-rose-500 mt-2 font-semibold">Including Meta Ad & Office</span>
                </div>
                <div className="bg-blue-950/40 p-6 rounded-2xl border border-blue-500/30 flex flex-col items-center justify-center relative overflow-hidden shadow-lg group hover:border-blue-500/60 transition-all">
                  <span className="text-blue-400 text-xs font-bold font-mono uppercase tracking-widest mb-2">Total Bank Deposits</span>
                  <span className="text-4xl font-black text-blue-300 font-mono">₹{totalOverviewDeposit.toLocaleString()}</span>
                  <span className="text-[11px] text-blue-500 mt-2 font-semibold">Transferred to Bank</span>
                </div>
                <div className="bg-amber-950/40 p-6 rounded-2xl border border-amber-500/40 flex flex-col items-center justify-center relative overflow-hidden shadow-xl group hover:border-amber-500 transition-all shadow-[0_0_20px_rgba(245,158,11,0.1)]">
                  <span className="text-amber-400 text-xs font-bold font-mono uppercase tracking-widest mb-2">In Hand Cash Reserve</span>
                  <span className="text-4xl font-black text-amber-300 font-mono">₹{totalInHand.toLocaleString()}</span>
                  <span className="text-[11px] text-amber-400/80 mt-2 font-semibold">Cash Income minus Deposits</span>
                </div>
              </div>
            </CardContent>
          </GlassCard>
        </TabsContent>

        {/* INCOME TAB */}
        <TabsContent value="income" className="space-y-6">
          <GlassCard>
            <CardHeader className="flex flex-row items-center justify-between cursor-pointer" onClick={() => setShowIncomeForm(!showIncomeForm)}>
              <CardTitle>Add Income</CardTitle>
              <Button variant="ghost" size="sm" className="p-0 h-8 w-8 hover:bg-transparent">
                {showIncomeForm ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
              </Button>
            </CardHeader>
            {showIncomeForm && (
              <CardContent>
                <form onSubmit={handleAddIncome} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" className="[&::-webkit-calendar-picker-indicator]:block" value={incomeForm.date} onChange={e => setIncomeForm({ ...incomeForm, date: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Client Name</Label>
                    <Autocomplete
                      value={incomeForm.clientName}
                      onChange={v => setIncomeForm({ ...incomeForm, clientName: v })}
                      suggestions={clients}
                      placeholder="Type client name..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Autocomplete
                      value={incomeForm.category}
                      onChange={v => setIncomeForm({ ...incomeForm, category: v })}
                      suggestions={categories}
                      placeholder="Type category..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Mode</Label>
                    <Autocomplete
                      value={incomeForm.paymentMethod}
                      onChange={v => setIncomeForm({ ...incomeForm, paymentMethod: v })}
                      suggestions={paymentMethods}
                      placeholder="Type payment mode..."
                    />
                  </div>
                  {incomeForm.paymentMethod.toLowerCase() === 'cheque' && (
                    <div className="space-y-2">
                      <Label>Cheque No. *</Label>
                      <Input
                        value={incomeForm.chequeNo}
                        onChange={e => setIncomeForm({ ...incomeForm, chequeNo: e.target.value })}
                        placeholder="Alphanumeric Cheque No."
                        required
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Deposited Bank</Label>
                    <Autocomplete
                      value={incomeForm.bank}
                      onChange={v => setIncomeForm({ ...incomeForm, bank: v })}
                      suggestions={banks}
                      placeholder="Type deposited bank..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ref No.</Label>
                    <Input value={incomeForm.rfNo} onChange={e => setIncomeForm({ ...incomeForm, rfNo: e.target.value })} placeholder="Optional" />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input type="number" step="0.01" value={incomeForm.amount} onChange={e => setIncomeForm({ ...incomeForm, amount: e.target.value })} required placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Invoice / Proforma No.</Label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border rounded-md p-1 bg-muted/30 h-10">
                        <label className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold cursor-pointer rounded hover:bg-accent/50">
                          <input
                            type="radio"
                            name="invoicePrefix"
                            checked={incomeForm.invoicePrefix === 'INV'}
                            onChange={() => setIncomeForm({ ...incomeForm, invoicePrefix: 'INV' })}
                            className="accent-green-700"
                          />
                          INV
                        </label>
                        <label className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold cursor-pointer rounded hover:bg-accent/50">
                          <input
                            type="radio"
                            name="invoicePrefix"
                            checked={incomeForm.invoicePrefix === 'PFI'}
                            onChange={() => setIncomeForm({ ...incomeForm, invoicePrefix: 'PFI' })}
                            className="accent-green-700"
                          />
                          PFI
                        </label>
                      </div>
                      <Input
                        value={incomeForm.invoiceNumber}
                        onChange={e => setIncomeForm({ ...incomeForm, invoiceNumber: e.target.value })}
                        placeholder="e.g. 1234"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Remarks</Label>
                    <Input value={incomeForm.remarks} onChange={e => setIncomeForm({ ...incomeForm, remarks: e.target.value })} placeholder="Optional" />
                  </div>
                  <div className="flex items-center space-x-2 py-2">
                    <Checkbox
                      id="income-gst"
                      checked={incomeForm.isGst}
                      onCheckedChange={(checked) => setIncomeForm({ ...incomeForm, isGst: checked === true })}
                    />
                    <Label htmlFor="income-gst" className="font-medium cursor-pointer">GST (18% Included)</Label>
                  </div>
                  {incomeForm.isGst && (
                    <>
                      <div className="space-y-2">
                        <Label>Without GST Amount</Label>
                        <Input
                          type="text"
                          readOnly
                          value={incomeForm.amount ? (Number(incomeForm.amount) / 1.18).toFixed(2) : '0.00'}
                          className="bg-muted text-muted-foreground font-semibold"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>GST Amount (18%)</Label>
                        <Input
                          type="text"
                          readOnly
                          value={incomeForm.amount ? (Number(incomeForm.amount) - Number(incomeForm.amount) / 1.18).toFixed(2) : '0.00'}
                          className="bg-muted text-muted-foreground font-semibold"
                        />
                      </div>
                    </>
                  )}
                  <div className={incomeForm.isGst ? "md:col-span-1" : "md:col-span-1 md:col-start-4"}>
                    <Button type="submit" className="w-full bg-green-800 hover:bg-green-900 text-white font-semibold">Add Income</Button>
                  </div>
                </form>
              </CardContent>
            )}
          </GlassCard>

          <GlassCard>
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle>Income Records</CardTitle>
              <div className="flex items-center gap-2">
                <Input type="date" className="h-9 w-auto [&::-webkit-calendar-picker-indicator]:block" value={incomeFilters.startDate} onChange={e => setIncomeFilters({ ...incomeFilters, startDate: e.target.value })} placeholder="Start Date" />
                <span className="text-muted-foreground">-</span>
                <Input type="date" className="h-9 w-auto [&::-webkit-calendar-picker-indicator]:block" value={incomeFilters.endDate} onChange={e => setIncomeFilters({ ...incomeFilters, endDate: e.target.value })} placeholder="End Date" />
                <Button variant="outline" size="sm" onClick={() => setIncomeFilters({ clientName: 'All', category: 'All', paymentMethod: 'All', bank: 'All', month: 'All', year: 'All', invoiceNumber: '', startDate: '', endDate: '' })}>
                  Reset Filters
                </Button>
                <Button variant="outline" size="sm" onClick={() => handlePreviewPDF(filteredIncomes, 'Income Records')}>
                  <Download className="w-4 h-4 mr-2" /> Export PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 justify-between mb-4">
                <div className="grid grid-cols-2 md:grid-cols-7 gap-3 flex-1">
                  <Input
                    placeholder="Filter Invoice No."
                    value={incomeFilters.invoiceNumber}
                    onChange={e => setIncomeFilters({ ...incomeFilters, invoiceNumber: e.target.value })}
                    className="h-10"
                  />
                  <Autocomplete
                    value={incomeFilters.clientName === 'All' ? '' : incomeFilters.clientName}
                    onChange={v => setIncomeFilters({ ...incomeFilters, clientName: v || 'All' })}
                    suggestions={['All', ...Array.from(new Set([...clients, ...getUniqueValues(incomes, 'clientName')].filter(Boolean))).map(String)]}
                    placeholder="All Clients"
                  />
                  <Autocomplete
                    value={incomeFilters.category === 'All' ? '' : incomeFilters.category}
                    onChange={v => setIncomeFilters({ ...incomeFilters, category: v || 'All' })}
                    suggestions={['All', ...Array.from(new Set([...categories, ...getUniqueValues(incomes, 'category')].filter(Boolean))).map(String)]}
                    placeholder="All Categories"
                  />
                  <Autocomplete
                    value={incomeFilters.paymentMethod === 'All' ? '' : incomeFilters.paymentMethod}
                    onChange={v => setIncomeFilters({ ...incomeFilters, paymentMethod: v || 'All' })}
                    suggestions={['All', ...Array.from(new Set([...paymentMethods, ...getUniqueValues(incomes, 'paymentMethod')].filter(Boolean))).map(String)]}
                    placeholder="All Modes"
                  />
                  <Autocomplete
                    value={incomeFilters.bank === 'All' ? '' : incomeFilters.bank}
                    onChange={v => setIncomeFilters({ ...incomeFilters, bank: v || 'All' })}
                    suggestions={['All', ...Array.from(new Set([...banks, ...getUniqueValues(incomes, 'bank')].filter(Boolean))).map(String)]}
                    placeholder="All Banks"
                  />
                  <Autocomplete
                    value={incomeFilters.month === 'All' ? '' : incomeFilters.month}
                    onChange={v => setIncomeFilters({ ...incomeFilters, month: v || 'All' })}
                    suggestions={['All', ...Array.from(new Set(getUniqueValues(incomes, 'month').filter(Boolean))).map(String)]}
                    placeholder="All Months"
                  />
                  <Autocomplete
                    value={incomeFilters.year === 'All' ? '' : incomeFilters.year}
                    onChange={v => setIncomeFilters({ ...incomeFilters, year: v || 'All' })}
                    suggestions={['All', ...Array.from(new Set(getUniqueValues(incomes, 'year').filter(Boolean))).map(String)]}
                    placeholder="All Years"
                  />
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <div className="bg-success/10 text-success px-4 py-2 rounded-lg border border-success/20 shadow-sm flex items-center justify-center gap-3">
                    <span className="font-semibold text-sm">Total Income:</span>
                    <span className="text-xl font-bold">₹{totalIncome.toLocaleString()}</span>
                  </div>
                  <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-4 py-2 rounded-lg border border-amber-500/20 shadow-sm flex items-center justify-center gap-3">
                    <span className="font-semibold text-sm">Total GST:</span>
                    <span className="text-xl font-bold">₹{totalIncomeGst.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-green-100 hover:bg-green-200 text-green-900">
                      <TableHead className="text-green-900 font-semibold">Date</TableHead>
                      <TableHead className="text-green-900 font-semibold">Client Name</TableHead>
                      <TableHead className="text-green-900 font-semibold">Category</TableHead>
                      <TableHead className="text-green-900 font-semibold">Mode of Payment</TableHead>
                      <TableHead className="text-green-900 font-semibold">Deposited Bank</TableHead>
                      <TableHead className="text-green-900 font-semibold">Ref No.</TableHead>
                      <TableHead className="text-green-900 font-semibold">Month</TableHead>
                      <TableHead className="text-green-900 font-semibold">Year</TableHead>
                      <TableHead className="text-green-900 font-semibold">Invoice No.</TableHead>
                      <TableHead className="text-green-900 font-semibold">Remarks</TableHead>
                      <TableHead className="text-right text-green-900 font-semibold">Amount</TableHead>
                      <TableHead className="text-right text-green-900 font-semibold">GST</TableHead>
                      <TableHead className="w-[80px] text-green-900"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIncomes.map((inc) => (
                      <TableRow key={inc.id}>
                        <TableCell>{formatDate(inc.date)}</TableCell>
                        <TableCell className="font-medium">{inc.clientName}</TableCell>
                        <TableCell>{inc.category || '-'}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{inc.paymentMethod}</span>
                            {inc.paymentMethod.toLowerCase() === 'cheque' && inc.chequeNo && (
                              <span className="text-xs text-muted-foreground font-medium mt-0.5">
                                No. : {inc.chequeNo}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{inc.bank}</TableCell>
                        <TableCell>{inc.rfNo || '-'}</TableCell>
                        <TableCell>{inc.month}</TableCell>
                        <TableCell>{inc.year}</TableCell>
                        <TableCell>{inc.invoiceNumber || '-'}</TableCell>
                        <TableCell className="max-w-[150px] truncate" title={inc.remarks}>{inc.remarks || '-'}</TableCell>
                        <TableCell className="text-right font-medium">₹{inc.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium text-amber-600 dark:text-amber-400">{inc.gstAmount ? `₹${inc.gstAmount.toLocaleString()}` : '-'}</TableCell>
                        <TableCell className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => setEditingIncome(inc)} className="text-blue-500 hover:text-blue-700">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteIncome(inc.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredIncomes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-4 text-muted-foreground">No income records found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </GlassCard>
        </TabsContent>

        {/* EXPENSE TAB */}
        <TabsContent value="expense" className="space-y-4 mt-4">
          <GlassCard>
            <CardHeader className="flex flex-row items-center justify-between cursor-pointer" onClick={() => setShowExpenseForm(!showExpenseForm)}>
              <CardTitle>Add Expense</CardTitle>
              <Button variant="ghost" size="sm" className="p-0 h-8 w-8 hover:bg-transparent">
                {showExpenseForm ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
              </Button>
            </CardHeader>
            {showExpenseForm && (
              <CardContent>
                <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" className="[&::-webkit-calendar-picker-indicator]:block" value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Client Name</Label>
                    <Autocomplete
                      value={expenseForm.clientName}
                      onChange={v => setExpenseForm({ ...expenseForm, clientName: v })}
                      suggestions={clients}
                      placeholder="Type client name..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Autocomplete
                      value={expenseForm.category}
                      onChange={v => setExpenseForm({ ...expenseForm, category: v })}
                      suggestions={categories}
                      placeholder="Type category..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Mode</Label>
                    <Autocomplete
                      value={expenseForm.paymentMethod}
                      onChange={v => setExpenseForm({ ...expenseForm, paymentMethod: v })}
                      suggestions={paymentMethods}
                      placeholder="Type payment mode..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bank</Label>
                    <Autocomplete
                      value={expenseForm.bank}
                      onChange={v => setExpenseForm({ ...expenseForm, bank: v })}
                      suggestions={banks}
                      placeholder="Type bank..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ref No.</Label>
                    <Input value={expenseForm.rfNo} onChange={e => setExpenseForm({ ...expenseForm, rfNo: e.target.value })} placeholder="Optional" />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input type="number" step="0.01" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} required placeholder="0.00" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Remarks</Label>
                    <Input value={expenseForm.remarks} onChange={e => setExpenseForm({ ...expenseForm, remarks: e.target.value })} placeholder="Optional" />
                  </div>
                  <div className="flex items-center space-x-2 py-2">
                    <Checkbox
                      id="expense-gst"
                      checked={expenseForm.isGst}
                      onCheckedChange={(checked) => setExpenseForm({ ...expenseForm, isGst: checked === true })}
                    />
                    <Label htmlFor="expense-gst" className="font-medium cursor-pointer">GST (18% Included)</Label>
                  </div>
                  {expenseForm.isGst && (
                    <>
                      <div className="space-y-2">
                        <Label>Without GST Amount</Label>
                        <Input
                          type="text"
                          readOnly
                          value={expenseForm.amount ? (Number(expenseForm.amount) / 1.18).toFixed(2) : '0.00'}
                          className="bg-muted text-muted-foreground font-semibold"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>GST Amount (18%)</Label>
                        <Input
                          type="text"
                          readOnly
                          value={expenseForm.amount ? (Number(expenseForm.amount) - Number(expenseForm.amount) / 1.18).toFixed(2) : '0.00'}
                          className="bg-muted text-muted-foreground font-semibold"
                        />
                      </div>
                    </>
                  )}
                  <div className={expenseForm.isGst ? "md:col-span-1" : "md:col-span-1 md:col-start-4"}>
                    <Button type="submit" variant="destructive" className="w-full">Add Expense</Button>
                  </div>
                </form>
              </CardContent>
            )}
          </GlassCard>

          <GlassCard>
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle>Expense Records</CardTitle>
              <div className="flex items-center gap-2">
                <Input type="date" className="h-9 w-auto [&::-webkit-calendar-picker-indicator]:block" value={expenseFilters.startDate} onChange={e => setExpenseFilters({ ...expenseFilters, startDate: e.target.value })} placeholder="Start Date" />
                <span className="text-muted-foreground">-</span>
                <Input type="date" className="h-9 w-auto [&::-webkit-calendar-picker-indicator]:block" value={expenseFilters.endDate} onChange={e => setExpenseFilters({ ...expenseFilters, endDate: e.target.value })} placeholder="End Date" />
                <Button variant="outline" size="sm" onClick={() => setExpenseFilters({ clientName: 'All', category: 'All', month: 'All', year: 'All', startDate: '', endDate: '' })}>
                  Reset Filters
                </Button>
                <Button variant="outline" size="sm" onClick={() => handlePreviewPDF(filteredExpenses, 'Expense Records')}>
                  <Download className="w-4 h-4 mr-2" /> Export PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 justify-between mb-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
                  <Autocomplete
                    value={expenseFilters.category === 'All' ? '' : expenseFilters.category}
                    onChange={v => setExpenseFilters({ ...expenseFilters, category: v || 'All' })}
                    suggestions={['All', ...Array.from(new Set([...categories, ...getUniqueValues(expenses, 'category')].filter(Boolean))).map(String)]}
                    placeholder="All Categories"
                  />
                  <Autocomplete
                    value={expenseFilters.clientName === 'All' ? '' : expenseFilters.clientName}
                    onChange={v => setExpenseFilters({ ...expenseFilters, clientName: v || 'All' })}
                    suggestions={['All', ...Array.from(new Set([...clients, ...getUniqueValues(expenses, 'clientName')].filter(Boolean))).map(String)]}
                    placeholder="All Clients"
                  />
                  <Autocomplete
                    value={expenseFilters.month === 'All' ? '' : expenseFilters.month}
                    onChange={v => setExpenseFilters({ ...expenseFilters, month: v || 'All' })}
                    suggestions={['All', ...Array.from(new Set(getUniqueValues(expenses, 'month').filter(Boolean))).map(String)]}
                    placeholder="All Months"
                  />
                  <Autocomplete
                    value={expenseFilters.year === 'All' ? '' : expenseFilters.year}
                    onChange={v => setExpenseFilters({ ...expenseFilters, year: v || 'All' })}
                    suggestions={['All', ...Array.from(new Set(getUniqueValues(expenses, 'year').filter(Boolean))).map(String)]}
                    placeholder="All Years"
                  />
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-lg border border-destructive/20 shadow-sm flex items-center justify-center gap-3">
                    <span className="font-semibold text-sm">Total Expense:</span>
                    <span className="text-xl font-bold">₹{totalExpense.toLocaleString()}</span>
                  </div>
                  <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-4 py-2 rounded-lg border border-amber-500/20 shadow-sm flex items-center justify-center gap-3">
                    <span className="font-semibold text-sm">Total GST:</span>
                    <span className="text-xl font-bold">₹{totalExpenseGst.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-xl">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-950/80 hover:bg-slate-950/80 text-slate-400 font-mono text-xs uppercase tracking-wider border-b border-white/10">
                      <TableHead className="py-4">Submitted By</TableHead>
                      <TableHead className="py-4">Date</TableHead>
                      <TableHead className="py-4">Client Name</TableHead>
                      <TableHead className="py-4">Category</TableHead>
                      <TableHead className="py-4">Bank</TableHead>
                      <TableHead className="py-4">Ref No.</TableHead>
                      <TableHead className="py-4">Period</TableHead>
                      <TableHead className="py-4">Remarks</TableHead>
                      <TableHead className="py-4 text-right">Amount</TableHead>
                      <TableHead className="py-4 text-right">GST</TableHead>
                      <TableHead className="py-4 w-[90px] text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-white/5">
                    {filteredExpenses.map((exp) => (
                      <TableRow key={exp.id} className="hover:bg-slate-800/40 transition-colors group">
                        <TableCell className="py-3.5">
                          {exp.staffName ? (
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-[11px] font-extrabold text-white shadow-sm shrink-0">
                                {exp.staffName.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-semibold text-white">{exp.staffName}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500 font-mono">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-300">{formatDate(exp.date)}</TableCell>
                        <TableCell className="font-semibold text-slate-200">{exp.clientName || '-'}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            {exp.category}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-300">{exp.bank || '-'}</TableCell>
                        <TableCell className="font-mono text-xs text-slate-400">{exp.rfNo || '-'}</TableCell>
                        <TableCell className="text-xs text-slate-300 font-semibold">{exp.month.slice(0, 3)} {exp.year}</TableCell>
                        <TableCell className="max-w-[150px] truncate text-xs text-slate-300" title={exp.remarks}>{exp.remarks || '-'}</TableCell>
                        <TableCell className="text-right font-mono text-base font-extrabold text-rose-400">₹{exp.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold text-amber-400">{exp.gstAmount ? `₹${exp.gstAmount.toLocaleString()}` : '-'}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-1 justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" onClick={() => setEditingExpense(exp)} className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteExpense(exp.id)} className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredExpenses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-slate-500 font-medium">No expense records found matching criteria</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </GlassCard>
        </TabsContent>

        {/* AD EXPENSE TAB */}
        <TabsContent value="ad-expense" className="space-y-4 mt-4">
          <GlassCard>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-4">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  Ad Expense Records
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                    Meta Ad
                  </span>
                </CardTitle>
                <CardDescription>Filtered view of all approved Meta Ad expenses.</CardDescription>
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                <span className="text-sm font-semibold text-primary px-3 py-1 bg-primary/10 rounded-full">
                  Total Ad Expense: ₹{totalAdExpense.toLocaleString()}
                </span>
                <span className="text-sm font-semibold text-amber-600 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 rounded-full">
                  Total GST: ₹{totalAdExpenseGst.toLocaleString()}
                </span>
                <Button variant="outline" size="sm" onClick={() => handleExportAdExpensePDF()}>
                  <FileText className="w-4 h-4 mr-1" /> Export PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 bg-muted/30 p-3 rounded-lg border">
                <div>
                  <Label className="text-xs mb-1 block">Client Name</Label>
                  <Autocomplete
                    value={adExpenseFilters.clientName === 'All' ? '' : adExpenseFilters.clientName}
                    onChange={v => setAdExpenseFilters({ ...adExpenseFilters, clientName: v || 'All' })}
                    suggestions={['All', ...Array.from(new Set(getUniqueValues(expenses.filter(e => isMetaAd(e.category)), 'clientName').filter(Boolean))).map(String)]}
                    placeholder="All Clients"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Month</Label>
                  <Autocomplete
                    value={adExpenseFilters.month === 'All' ? '' : adExpenseFilters.month}
                    onChange={v => setAdExpenseFilters({ ...adExpenseFilters, month: v || 'All' })}
                    suggestions={['All', ...Array.from(new Set(getUniqueValues(expenses.filter(e => isMetaAd(e.category)), 'month').filter(Boolean))).map(String)]}
                    placeholder="All Months"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Year</Label>
                  <Autocomplete
                    value={adExpenseFilters.year === 'All' ? '' : adExpenseFilters.year}
                    onChange={v => setAdExpenseFilters({ ...adExpenseFilters, year: v || 'All' })}
                    suggestions={['All', ...Array.from(new Set(getUniqueValues(expenses.filter(e => isMetaAd(e.category)), 'year').filter(Boolean))).map(String)]}
                    placeholder="All Years"
                  />
                </div>
                <div className="flex items-end">
                  <Button variant="ghost" size="sm" onClick={() => setAdExpenseFilters({ clientName: 'All', month: 'All', year: 'All' })} className="h-8 text-xs text-muted-foreground hover:text-foreground">
                    Reset Filters
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-xl">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-950/80 hover:bg-slate-950/80 text-slate-400 font-mono text-xs uppercase tracking-wider border-b border-white/10">
                      <TableHead className="py-4">Submitted By</TableHead>
                      <TableHead className="py-4">Date</TableHead>
                      <TableHead className="py-4">Client Name</TableHead>
                      <TableHead className="py-4">Category</TableHead>
                      <TableHead className="py-4">Payment Mode</TableHead>
                      <TableHead className="py-4">Bank</TableHead>
                      <TableHead className="py-4">Ref No.</TableHead>
                      <TableHead className="py-4">Remarks</TableHead>
                      <TableHead className="py-4 text-right">Amount</TableHead>
                      <TableHead className="py-4 text-right">GST</TableHead>
                      <TableHead className="py-4 w-[90px] text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-white/5">
                    {filteredAdExpenses.map((exp) => (
                      <TableRow key={exp.id} className="hover:bg-slate-800/40 transition-colors group">
                        <TableCell className="py-3.5">
                          {exp.staffName ? (
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-[11px] font-extrabold text-white shadow-sm shrink-0">
                                {exp.staffName.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-semibold text-white">{exp.staffName}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500 font-mono">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-300">{formatDate(exp.date)}</TableCell>
                        <TableCell className="font-bold text-cyan-300">{exp.clientName || '-'}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                            {exp.category}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-300 font-medium">{exp.paymentMethod || '-'}</TableCell>
                        <TableCell className="text-xs font-semibold text-slate-300">{exp.bank || '-'}</TableCell>
                        <TableCell className="font-mono text-xs text-slate-400">{exp.rfNo || '-'}</TableCell>
                        <TableCell className="max-w-[150px] truncate text-xs text-slate-300" title={exp.remarks}>{exp.remarks || '-'}</TableCell>
                        <TableCell className="text-right font-mono text-base font-extrabold text-cyan-400">₹{exp.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold text-amber-400">{exp.isGst && exp.gstAmount ? `₹${exp.gstAmount.toLocaleString()}` : '-'}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-1 justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" onClick={() => setEditingExpense({ ...exp })} className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteExpense(exp.id)} className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredAdExpenses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-slate-500 font-medium">No Ad expense records found matching criteria</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </GlassCard>
        </TabsContent>

        {/* BANK DEPOSIT TAB */}
        <TabsContent value="bank-deposit" className="space-y-4 mt-4">
          <GlassCard>
            <CardHeader className="flex flex-row items-center justify-between cursor-pointer" onClick={() => setShowBankDepositForm(!showBankDepositForm)}>
              <CardTitle>Add Bank Deposit</CardTitle>
              <Button variant="ghost" size="sm" className="p-0 h-8 w-8 hover:bg-transparent">
                {showBankDepositForm ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
              </Button>
            </CardHeader>
            {showBankDepositForm && (
              <CardContent>
                <form onSubmit={handleAddBankDeposit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" className="[&::-webkit-calendar-picker-indicator]:block" value={bankDepositForm.date} onChange={e => setBankDepositForm({ ...bankDepositForm, date: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Autocomplete
                      value={bankDepositForm.type}
                      onChange={v => setBankDepositForm({ ...bankDepositForm, type: v })}
                      suggestions={['Cash', 'Cheque']}
                      placeholder="Type Cash/Cheque..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Deposited Bank</Label>
                    <Autocomplete
                      value={bankDepositForm.bank}
                      onChange={v => setBankDepositForm({ ...bankDepositForm, bank: v })}
                      suggestions={banks}
                      placeholder="Type bank..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input type="number" step="0.01" value={bankDepositForm.amount} onChange={e => setBankDepositForm({ ...bankDepositForm, amount: e.target.value })} required placeholder="0.00" />
                  </div>
                  {bankDepositForm.type === 'Cheque' && (
                    <>
                      <div className="space-y-2">
                        <Label>Cheque No.</Label>
                        <Input value={bankDepositForm.chequeNo} onChange={e => setBankDepositForm({ ...bankDepositForm, chequeNo: e.target.value })} required placeholder="Alphanumeric" />
                      </div>
                      <div className="space-y-2">
                        <Label>Bank Name</Label>
                        <Autocomplete
                          value={bankDepositForm.bankName}
                          onChange={v => setBankDepositForm({ ...bankDepositForm, bankName: v })}
                          suggestions={banks}
                          placeholder="Type bank name..."
                        />
                      </div>
                    </>
                  )}
                  <div className="space-y-2">
                    <Label>Remarks</Label>
                    <Input value={bankDepositForm.remarks} onChange={e => setBankDepositForm({ ...bankDepositForm, remarks: e.target.value })} placeholder="Optional" />
                  </div>
                  <div className="md:col-span-1">
                    <Button type="submit" variant="royal" className="w-full">Add Deposit</Button>
                  </div>
                </form>
              </CardContent>
            )}
          </GlassCard>

          <GlassCard>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Bank Deposits History</CardTitle>
              <Button variant="outline" size="sm" onClick={() => handlePreviewPDF(filteredBankDeposits, 'Bank Deposits')}>
                <Download className="w-4 h-4 mr-2" /> Export PDF
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 justify-between mb-4">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 flex-1 items-center">
                  <Input type="date" className="h-10 [&::-webkit-calendar-picker-indicator]:block" value={bankDepositFilters.startDate} onChange={e => setBankDepositFilters({ ...bankDepositFilters, startDate: e.target.value })} placeholder="Start Date" />
                  <Input type="date" className="h-10 [&::-webkit-calendar-picker-indicator]:block" value={bankDepositFilters.endDate} onChange={e => setBankDepositFilters({ ...bankDepositFilters, endDate: e.target.value })} placeholder="End Date" />
                  <Autocomplete
                    value={bankDepositFilters.type === 'All' ? '' : bankDepositFilters.type}
                    onChange={v => setBankDepositFilters({ ...bankDepositFilters, type: v || 'All' })}
                    suggestions={['All', 'Cash', 'Cheque']}
                    placeholder="All Types"
                  />
                  <Autocomplete
                    value={bankDepositFilters.month === 'All' ? '' : bankDepositFilters.month}
                    onChange={v => setBankDepositFilters({ ...bankDepositFilters, month: v || 'All' })}
                    suggestions={['All', ...Array.from(new Set(getUniqueValues(bankDeposits, 'month').filter(Boolean))).map(String)]}
                    placeholder="All Months"
                  />
                  <Autocomplete
                    value={bankDepositFilters.year === 'All' ? '' : bankDepositFilters.year}
                    onChange={v => setBankDepositFilters({ ...bankDepositFilters, year: v || 'All' })}
                    suggestions={['All', ...Array.from(new Set(getUniqueValues(bankDeposits, 'year').filter(Boolean))).map(String)]}
                    placeholder="All Years"
                  />
                  <Button variant="outline" size="sm" onClick={() => setBankDepositFilters({ type: 'All', month: 'All', year: 'All', startDate: '', endDate: '' })} className="h-10">
                    Reset Filters
                  </Button>
                </div>
                <div className="bg-blue-100/50 text-blue-800 px-4 py-2 rounded-lg border border-blue-200 flex items-center gap-3 shrink-0">
                  <span className="font-semibold text-sm">Total Deposit:</span>
                  <span className="text-xl font-bold">₹{totalBankDeposit.toLocaleString()}</span>
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-blue-50 hover:bg-blue-50">
                      <TableHead>Date</TableHead>
                      <TableHead>Deposited Bank</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Cheque Details</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBankDeposits.map((dep) => (
                      <TableRow key={dep.id}>
                        <TableCell>{formatDate(dep.date)}</TableCell>
                        <TableCell>{dep.bank || '-'}</TableCell>
                        <TableCell className="font-medium">{dep.type}</TableCell>
                        <TableCell>{dep.type === 'Cheque' ? `${dep.chequeNo} (${dep.bankName})` : '-'}</TableCell>
                        <TableCell>{dep.month}</TableCell>
                        <TableCell>{dep.year}</TableCell>
                        <TableCell className="max-w-[150px] truncate" title={dep.remarks}>{dep.remarks || '-'}</TableCell>
                        <TableCell className="text-right font-medium text-blue-700">₹{dep.amount.toLocaleString()}</TableCell>
                        <TableCell className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => setEditingBankDeposit(dep)} className="text-blue-500 hover:text-blue-700">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteBankDeposit(dep.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredBankDeposits.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">No bank deposit records found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </GlassCard>
        </TabsContent>

        {/* LEDGER TAB */}
        <TabsContent value="ledger" className="space-y-4 mt-4">
          {/* Summary Cards Top */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <GlassCard className="p-4 bg-green-50/80 dark:bg-green-950/30 border-green-200 dark:border-green-800">
              <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider">Total Income</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">₹{totalLedgerIncome.toLocaleString()}</p>
              <p className="text-xs text-green-700 dark:text-green-400 mt-1">GST Included: ₹{totalLedgerIncomeGst.toLocaleString()}</p>
            </GlassCard>

            <GlassCard className="p-4 bg-red-50/80 dark:bg-red-950/30 border-red-200 dark:border-red-800">
              <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider">Total Expense</p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100 mt-1">₹{totalLedgerExpense.toLocaleString()}</p>
              <p className="text-xs text-red-700 dark:text-red-400 mt-1">GST Included: ₹{totalLedgerExpenseGst.toLocaleString()}</p>
            </GlassCard>

            <GlassCard className="p-4 bg-blue-50/80 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Net Balance</p>
              <p className={`text-2xl font-bold mt-1 ${totalLedgerIncome - totalLedgerExpense >= 0 ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                ₹{(totalLedgerIncome - totalLedgerExpense).toLocaleString()}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">Income minus Expense</p>
            </GlassCard>

            <GlassCard className="p-4 bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Net GST</p>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-100 mt-1">
                ₹{(totalLedgerIncomeGst - totalLedgerExpenseGst).toLocaleString()}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">Income GST - Expense GST</p>
            </GlassCard>
          </div>

          {/* Ledger Table Section */}
          <GlassCard>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 gap-4">
              <div>
                <CardTitle className="text-xl font-bold">Client Ledger Records</CardTitle>
                <CardDescription>Comprehensive client-wise breakdown of both Income and Expense transactions</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePreviewPDF(ledgerEntries, 'Client Ledger Records')}
                className="flex items-center gap-2 border-primary/20 hover:bg-primary/5"
              >
                <FileText className="h-4 w-4 text-primary" />
                <span>Download PDF</span>
              </Button>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 mb-6 bg-muted/30 p-3 rounded-lg border border-border/50">
                <div className="w-[240px]">
                  <Autocomplete
                    value={ledgerFilters.clientName === 'All' ? '' : ledgerFilters.clientName}
                    onChange={v => setLedgerFilters({ ...ledgerFilters, clientName: v || 'All' })}
                    suggestions={['All', ...Array.from(new Set([...clients, ...getUniqueValues([...incomes, ...expenses], 'clientName')].filter(Boolean))).map(String)]}
                    placeholder="All Clients"
                  />
                </div>

                <div className="w-[160px]">
                  <Autocomplete
                    value={ledgerFilters.month === 'All' ? '' : ledgerFilters.month}
                    onChange={v => setLedgerFilters({ ...ledgerFilters, month: v || 'All' })}
                    suggestions={['All', ...Array.from(new Set(getUniqueValues([...incomes, ...expenses], 'month').filter(Boolean))).map(String)]}
                    placeholder="All Months"
                  />
                </div>

                <div className="w-[140px]">
                  <Autocomplete
                    value={ledgerFilters.year === 'All' ? '' : ledgerFilters.year}
                    onChange={v => setLedgerFilters({ ...ledgerFilters, year: v || 'All' })}
                    suggestions={['All', ...Array.from(new Set(getUniqueValues([...incomes, ...expenses], 'year').filter(Boolean))).map(String)]}
                    placeholder="All Years"
                  />
                </div>

                {(ledgerFilters.clientName !== 'All' || ledgerFilters.month !== 'All' || ledgerFilters.year !== 'All') && (
                  <Button variant="ghost" size="sm" onClick={() => setLedgerFilters({ clientName: 'All', month: 'All', year: 'All' })} className="text-muted-foreground h-9">
                    Reset
                  </Button>
                )}
              </div>

              {/* Ledger Table */}
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/60">
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold">Client Name</TableHead>
                      <TableHead className="font-semibold">Category</TableHead>
                      <TableHead className="font-semibold">Remarks</TableHead>
                      <TableHead className="text-right font-semibold">Amount</TableHead>
                      <TableHead className="text-right font-semibold">GST</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerEntries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No ledger records found matching the filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      ledgerEntries.map((item) => (
                        <TableRow
                          key={`${item.type}-${item.id}`}
                          className={
                            item.type === 'Income'
                              ? 'bg-green-100/70 hover:bg-green-200/80 dark:bg-green-950/30 dark:hover:bg-green-900/40 text-green-950 dark:text-green-200 border-l-4 border-l-green-600'
                              : 'bg-red-100/70 hover:bg-red-200/80 dark:bg-red-950/30 dark:hover:bg-red-900/40 text-red-950 dark:text-red-200 border-l-4 border-l-red-600'
                          }
                        >
                          <TableCell className="font-medium">{formatDate(item.date)}</TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                item.type === 'Income'
                                  ? 'bg-green-600 text-white dark:bg-green-500 dark:text-green-950'
                                  : 'bg-red-600 text-white dark:bg-red-500 dark:text-red-950'
                              }`}
                            >
                              {item.type}
                            </span>
                          </TableCell>
                          <TableCell className="font-semibold">{item.clientName}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={item.remarks}>{item.remarks}</TableCell>
                          <TableCell className="text-right font-bold">₹{item.amount.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-medium">
                            {item.gstAmount ? `₹${item.gstAmount.toLocaleString()}` : '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </GlassCard>
        </TabsContent>

        {/* PENDING EXPENSE TAB */}
        <TabsContent value="pending-expense" className="space-y-6">
          <GlassCard className="bg-slate-900/90 border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 gap-4 border-b border-white/10 relative z-10">
              <div>
                <CardTitle className="text-2xl font-extrabold text-white flex items-center gap-3">
                  Pending Staff Expenses Queue
                  {pendingExpenses.length > 0 ? (
                    <span className="executive-badge bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse">
                      {pendingExpenses.length} Awaiting Confirmation
                    </span>
                  ) : (
                    <span className="executive-badge bg-emerald-500/20 text-emerald-400 border-emerald-500/40">
                      All Clear
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="text-slate-400 mt-1">
                  Review staff submissions. Clicking <strong className="text-emerald-400 font-semibold">✓ Confirm & Move to Ledger</strong> automatically verifies and transfers the record to your Expense / Meta Ad tables.
                </CardDescription>
              </div>
              {pendingExpenses.length > 0 && (
                <Button
                  onClick={handleApproveAllPendingExpenses}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-slate-950 font-extrabold flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] px-5 py-2.5 rounded-xl border border-emerald-400/50 transition-all transform hover:scale-105"
                >
                  <Check className="h-5 w-5 stroke-[3]" />
                  Confirm & Approve All ({pendingExpenses.length})
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-6 relative z-10">
              <div className="rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-xl">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-950/80 hover:bg-slate-950/80 text-slate-400 font-mono text-xs uppercase tracking-wider border-b border-white/10">
                      <TableHead className="py-4">Submitted By</TableHead>
                      <TableHead className="py-4">Date</TableHead>
                      <TableHead className="py-4">Client Name</TableHead>
                      <TableHead className="py-4">Category</TableHead>
                      <TableHead className="py-4">Payment Mode</TableHead>
                      <TableHead className="py-4">Bank</TableHead>
                      <TableHead className="py-4">Ref No.</TableHead>
                      <TableHead className="py-4">Remarks</TableHead>
                      <TableHead className="py-4 text-right">Amount</TableHead>
                      <TableHead className="py-4 text-right">GST</TableHead>
                      <TableHead className="py-4 text-right w-[180px]">Verification Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-white/5">
                    {pendingExpenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-16">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-1">
                              <ShieldCheck className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-bold text-white">No Pending Submissions</h3>
                            <p className="text-sm text-slate-400 max-w-md">All external API entries and staff expense requests have been confirmed and transferred to the main ledger.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingExpenses.map(item => {
                        const isEditing = editingPendingExpense?.id === item.id;
                        return (
                          <TableRow key={item.id} className="hover:bg-slate-800/40 transition-colors group">
                            <TableCell className="py-3.5">
                              {item.staffName ? (
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-[11px] font-extrabold text-slate-950 shadow-sm shrink-0">
                                    {item.staffName.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="font-semibold text-white">{item.staffName}</span>
                                </div>
                              ) : (
                                <span className="text-slate-500 font-mono">Staff Member</span>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-slate-300">
                              {isEditing ? (
                                <Input
                                  type="date"
                                  className="w-[135px] text-xs h-8 bg-slate-950 border-white/20"
                                  value={editingPendingExpense.date}
                                  onChange={e => setEditingPendingExpense({ ...editingPendingExpense, date: e.target.value })}
                                />
                              ) : formatDate(item.date)}
                            </TableCell>
                            <TableCell className="font-semibold text-slate-200">
                              {isEditing ? (
                                <Autocomplete
                                  value={editingPendingExpense.clientName || ''}
                                  onChange={v => setEditingPendingExpense({ ...editingPendingExpense, clientName: v })}
                                  suggestions={clients}
                                  placeholder="Client..."
                                  className="w-[140px]"
                                />
                              ) : (item.clientName || '-')}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Autocomplete
                                  value={editingPendingExpense.category}
                                  onChange={v => setEditingPendingExpense({ ...editingPendingExpense, category: v })}
                                  suggestions={categories}
                                  placeholder="Category..."
                                  className="w-[140px]"
                                />
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                  {item.category}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs font-medium text-slate-300">
                              {isEditing ? (
                                <Autocomplete
                                  value={editingPendingExpense.paymentMethod || ''}
                                  onChange={v => setEditingPendingExpense({ ...editingPendingExpense, paymentMethod: v })}
                                  suggestions={paymentMethods}
                                  placeholder="Mode..."
                                  className="w-[130px]"
                                />
                              ) : (item.paymentMethod || '-')}
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-slate-300">
                              {isEditing ? (
                                <Autocomplete
                                  value={editingPendingExpense.bank || ''}
                                  onChange={v => setEditingPendingExpense({ ...editingPendingExpense, bank: v })}
                                  suggestions={banks}
                                  placeholder="Bank..."
                                  className="w-[130px]"
                                />
                              ) : (item.bank || '-')}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-slate-400">
                              {isEditing ? (
                                <Input
                                  className="w-[100px] text-xs h-8 bg-slate-950 border-white/20"
                                  value={editingPendingExpense.rfNo || ''}
                                  onChange={e => setEditingPendingExpense({ ...editingPendingExpense, rfNo: e.target.value })}
                                />
                              ) : (item.rfNo || '-')}
                            </TableCell>
                            <TableCell className="max-w-[150px] truncate text-xs text-slate-300">
                              {isEditing ? (
                                <Input
                                  className="w-[150px] text-xs h-8 bg-slate-950 border-white/20"
                                  value={editingPendingExpense.remarks || ''}
                                  onChange={e => setEditingPendingExpense({ ...editingPendingExpense, remarks: e.target.value })}
                                />
                              ) : (item.remarks || '-')}
                            </TableCell>
                            <TableCell className="text-right font-mono text-base font-extrabold text-amber-400">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  step="0.01"
                                  className="w-[100px] text-xs h-8 bg-slate-950 border-white/20 text-right"
                                  value={editingPendingExpense.amount}
                                  onChange={e => setEditingPendingExpense({ ...editingPendingExpense, amount: Number(e.target.value) || 0 })}
                                />
                              ) : `₹${item.amount.toLocaleString()}`}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-amber-300">
                              {isEditing ? (
                                <div className="flex items-center justify-end gap-1">
                                  <Checkbox
                                    id={`admin-edit-gst-${item.id}`}
                                    checked={editingPendingExpense.isGst}
                                    onCheckedChange={(checked) => setEditingPendingExpense({ ...editingPendingExpense, isGst: checked === true })}
                                  />
                                  <Label htmlFor={`admin-edit-gst-${item.id}`} className="text-xs">GST</Label>
                                </div>
                              ) : (item.isGst && item.gstAmount ? `₹${item.gstAmount}` : '-')}
                            </TableCell>
                            <TableCell className="text-right">
                              {isEditing ? (
                                <div className="flex justify-end gap-2">
                                  <Button size="sm" onClick={handleUpdatePendingExpense} className="h-8 px-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs">
                                    Save
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingPendingExpense(null)} className="h-8 px-2 text-slate-400 hover:text-white">
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex justify-end items-center gap-1.5">
                                  <Button
                                    size="sm"
                                    onClick={() => handleApprovePendingExpense(item.id)}
                                    className="h-8 px-3 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-extrabold text-xs shadow-[0_0_12px_rgba(16,185,129,0.25)] flex items-center gap-1.5 transition-transform active:scale-95"
                                    title="Confirm & Move to main Expense table"
                                  >
                                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                                    Confirm
                                  </Button>
                                  <Button size="icon" variant="ghost" onClick={() => setEditingPendingExpense({ ...item })} className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg" title="Edit row">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" onClick={() => handleDeletePendingExpense(item.id)} className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg" title="Delete row">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </GlassCard>
        </TabsContent>

        {/* SETTINGS TAB */}
        <TabsContent value="settings" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Clients Setting */}
            <GlassCard>
              <CardHeader><CardTitle>Manage Clients</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Input placeholder="New client name" value={newClient} onChange={e => setNewClient(e.target.value)} ref={clientInputRef} />
                  <Button onClick={() => handleAddSetting('accountClients', newClient, clients, setClients, () => setNewClient(''), clientInputRef)}>Add</Button>
                </div>
                <div className="space-y-2">
                  {clients.map(c => (
                    <div key={c} className="flex justify-between items-center p-2 bg-muted/50 rounded border">
                      {editingSetting?.key === 'accountClients' && editingSetting?.oldValue === c ? (
                        <div className="flex gap-2 w-full mr-2">
                          <Input value={editingSetting.newValue} onChange={(e) => setEditingSetting({ ...editingSetting, newValue: e.target.value })} autoFocus />
                          <Button size="sm" onClick={() => handleEditSetting('accountClients', c, editingSetting.newValue, clients, setClients)}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingSetting(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <>
                          <span>{c}</span>
                          <div>
                            <Button variant="ghost" size="sm" onClick={() => setEditingSetting({ key: 'accountClients', oldValue: c, newValue: c })}><Pencil className="w-4 h-4 text-blue-500" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveSetting('accountClients', c, clients, setClients)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {clients.length === 0 && <p className="text-sm text-muted-foreground text-center">No clients added.</p>}
                </div>
              </CardContent>
            </GlassCard>

            {/* Payment Methods Setting */}
            <GlassCard>
              <CardHeader><CardTitle>Manage Payment Methods</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Input placeholder="New payment method" value={newPaymentMethod} onChange={e => setNewPaymentMethod(e.target.value)} ref={paymentMethodInputRef} />
                  <Button onClick={() => handleAddSetting('accountPaymentMethods', newPaymentMethod, paymentMethods, setPaymentMethods, () => setNewPaymentMethod(''), paymentMethodInputRef)}>Add</Button>
                </div>
                <div className="space-y-2">
                  {paymentMethods.map(m => (
                    <div key={m} className="flex justify-between items-center p-2 bg-muted/50 rounded border">
                      {editingSetting?.key === 'accountPaymentMethods' && editingSetting?.oldValue === m ? (
                        <div className="flex gap-2 w-full mr-2">
                          <Input value={editingSetting.newValue} onChange={(e) => setEditingSetting({ ...editingSetting, newValue: e.target.value })} autoFocus />
                          <Button size="sm" onClick={() => handleEditSetting('accountPaymentMethods', m, editingSetting.newValue, paymentMethods, setPaymentMethods)}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingSetting(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <>
                          <span>{m}</span>
                          <div>
                            <Button variant="ghost" size="sm" onClick={() => setEditingSetting({ key: 'accountPaymentMethods', oldValue: m, newValue: m })}><Pencil className="w-4 h-4 text-blue-500" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveSetting('accountPaymentMethods', m, paymentMethods, setPaymentMethods)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {paymentMethods.length === 0 && <p className="text-sm text-muted-foreground text-center">No methods added.</p>}
                </div>
              </CardContent>
            </GlassCard>

            {/* Banks Setting */}
            <GlassCard>
              <CardHeader><CardTitle>Manage Banks</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Input placeholder="New bank name" value={newBank} onChange={e => setNewBank(e.target.value)} ref={bankInputRef} />
                  <Button onClick={() => handleAddSetting('accountBanks', newBank, banks, setBanks, () => setNewBank(''), bankInputRef)}>Add</Button>
                </div>
                <div className="space-y-2">
                  {banks.map(b => (
                    <div key={b} className="flex justify-between items-center p-2 bg-muted/50 rounded border">
                      {editingSetting?.key === 'accountBanks' && editingSetting?.oldValue === b ? (
                        <div className="flex gap-2 w-full mr-2">
                          <Input value={editingSetting.newValue} onChange={(e) => setEditingSetting({ ...editingSetting, newValue: e.target.value })} autoFocus />
                          <Button size="sm" onClick={() => handleEditSetting('accountBanks', b, editingSetting.newValue, banks, setBanks)}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingSetting(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <>
                          <span>{b}</span>
                          <div>
                            <Button variant="ghost" size="sm" onClick={() => setEditingSetting({ key: 'accountBanks', oldValue: b, newValue: b })}><Pencil className="w-4 h-4 text-blue-500" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveSetting('accountBanks', b, banks, setBanks)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {banks.length === 0 && <p className="text-sm text-muted-foreground text-center">No banks added.</p>}
                </div>
              </CardContent>
            </GlassCard>

            {/* Expense Categories Setting */}
            <GlassCard>
              <CardHeader><CardTitle>Manage Expense Categories</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Input placeholder="New category" value={newCategory} onChange={e => setNewCategory(e.target.value)} ref={categoryInputRef} />
                  <Button onClick={() => handleAddSetting('accountCategories', newCategory, categories, setCategories, () => setNewCategory(''), categoryInputRef)}>Add</Button>
                </div>
                <div className="space-y-2">
                  {categories.map(c => (
                    <div key={c} className="flex justify-between items-center p-2 bg-muted/50 rounded border">
                      {editingSetting?.key === 'accountCategories' && editingSetting?.oldValue === c ? (
                        <div className="flex gap-2 w-full mr-2">
                          <Input value={editingSetting.newValue} onChange={(e) => setEditingSetting({ ...editingSetting, newValue: e.target.value })} autoFocus />
                          <Button size="sm" onClick={() => handleEditSetting('accountCategories', c, editingSetting.newValue, categories, setCategories)}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingSetting(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <>
                          <span>{c}</span>
                          <div>
                            <Button variant="ghost" size="sm" onClick={() => setEditingSetting({ key: 'accountCategories', oldValue: c, newValue: c })}><Pencil className="w-4 h-4 text-blue-500" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveSetting('accountCategories', c, categories, setCategories)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {categories.length === 0 && <p className="text-sm text-muted-foreground text-center">No categories added.</p>}
                </div>
              </CardContent>
            </GlassCard>

          </div>
        </TabsContent>
      </Tabs>

      {/* EDIT INCOME DIALOG */}
      <Dialog open={!!editingIncome} onOpenChange={(open) => !open && setEditingIncome(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Income</DialogTitle>
          </DialogHeader>
          {editingIncome && (
            <form onSubmit={handleUpdateIncome} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" className="[&::-webkit-calendar-picker-indicator]:block" value={editingIncome.date} onChange={e => setEditingIncome({ ...editingIncome, date: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Client Name</Label>
                  <Autocomplete
                    value={editingIncome.clientName}
                    onChange={v => setEditingIncome({ ...editingIncome, clientName: v })}
                    suggestions={clients}
                    placeholder="Type client name..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Autocomplete
                    value={editingIncome.category || ''}
                    onChange={v => setEditingIncome({ ...editingIncome, category: v })}
                    suggestions={categories}
                    placeholder="Type category..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Mode</Label>
                  <Autocomplete
                    value={editingIncome.paymentMethod}
                    onChange={v => setEditingIncome({ ...editingIncome, paymentMethod: v })}
                    suggestions={paymentMethods}
                    placeholder="Type payment mode..."
                  />
                </div>
                {editingIncome.paymentMethod.toLowerCase() === 'cheque' && (
                  <div className="space-y-2">
                    <Label>Cheque No.</Label>
                    <Input
                      value={editingIncome.chequeNo || ''}
                      onChange={e => setEditingIncome({ ...editingIncome, chequeNo: e.target.value })}
                      placeholder="Alphanumeric Cheque No."
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Deposited Bank</Label>
                  <Autocomplete
                    value={editingIncome.bank}
                    onChange={v => setEditingIncome({ ...editingIncome, bank: v })}
                    suggestions={banks}
                    placeholder="Type bank..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input type="number" step="0.01" value={editingIncome.amount} onChange={e => setEditingIncome({ ...editingIncome, amount: Number(e.target.value) })} required />
                </div>
                <div className="space-y-2">
                  <Label>Invoice/Proforma No.</Label>
                  <Input value={editingIncome.invoiceNumber || ''} onChange={e => setEditingIncome({ ...editingIncome, invoiceNumber: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Ref No.</Label>
                  <Input value={editingIncome.rfNo || ''} onChange={e => setEditingIncome({ ...editingIncome, rfNo: e.target.value })} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Remarks</Label>
                  <Input value={editingIncome.remarks || ''} onChange={e => setEditingIncome({ ...editingIncome, remarks: e.target.value })} />
                </div>
                <div className="flex items-center space-x-2 py-1 col-span-2">
                  <Checkbox
                    id="edit-income-gst"
                    checked={editingIncome.isGst || false}
                    onCheckedChange={(checked) => setEditingIncome({ ...editingIncome, isGst: checked === true })}
                  />
                  <Label htmlFor="edit-income-gst" className="font-medium cursor-pointer">GST (18% Included)</Label>
                </div>
                {editingIncome.isGst && (
                  <>
                    <div className="space-y-2">
                      <Label>Without GST Amount</Label>
                      <Input
                        type="text"
                        readOnly
                        value={editingIncome.amount ? (Number(editingIncome.amount) / 1.18).toFixed(2) : '0.00'}
                        className="bg-muted text-muted-foreground font-semibold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>GST Amount (18%)</Label>
                      <Input
                        type="text"
                        readOnly
                        value={editingIncome.amount ? (Number(editingIncome.amount) - Number(editingIncome.amount) / 1.18).toFixed(2) : '0.00'}
                        className="bg-muted text-muted-foreground font-semibold"
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-end pt-4">
                <Button type="button" variant="ghost" onClick={() => setEditingIncome(null)} className="mr-2">Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* EDIT EXPENSE DIALOG */}
      <Dialog open={!!editingExpense} onOpenChange={(open) => !open && setEditingExpense(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          {editingExpense && (
            <form onSubmit={handleUpdateExpense} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" className="[&::-webkit-calendar-picker-indicator]:block" value={editingExpense.date} onChange={e => setEditingExpense({ ...editingExpense, date: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Autocomplete
                    value={editingExpense.category}
                    onChange={v => setEditingExpense({ ...editingExpense, category: v })}
                    suggestions={categories}
                    placeholder="Type category..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bank</Label>
                  <Autocomplete
                    value={editingExpense.bank || ''}
                    onChange={v => setEditingExpense({ ...editingExpense, bank: v })}
                    suggestions={banks}
                    placeholder="Type bank..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Client Name</Label>
                  <Autocomplete
                    value={editingExpense.clientName || ''}
                    onChange={v => setEditingExpense({ ...editingExpense, clientName: v })}
                    suggestions={clients}
                    placeholder="Type client name..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input type="number" step="0.01" value={editingExpense.amount} onChange={e => setEditingExpense({ ...editingExpense, amount: Number(e.target.value) })} required />
                </div>
                <div className="space-y-2">
                  <Label>Ref No.</Label>
                  <Input value={editingExpense.rfNo || ''} onChange={e => setEditingExpense({ ...editingExpense, rfNo: e.target.value })} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Remarks</Label>
                  <Input value={editingExpense.remarks || ''} onChange={e => setEditingExpense({ ...editingExpense, remarks: e.target.value })} />
                </div>
                <div className="flex items-center space-x-2 py-1 col-span-2">
                  <Checkbox
                    id="edit-expense-gst"
                    checked={editingExpense.isGst || false}
                    onCheckedChange={(checked) => setEditingExpense({ ...editingExpense, isGst: checked === true })}
                  />
                  <Label htmlFor="edit-expense-gst" className="font-medium cursor-pointer">GST (18% Included)</Label>
                </div>
                {editingExpense.isGst && (
                  <>
                    <div className="space-y-2">
                      <Label>Without GST Amount</Label>
                      <Input
                        type="text"
                        readOnly
                        value={editingExpense.amount ? (Number(editingExpense.amount) / 1.18).toFixed(2) : '0.00'}
                        className="bg-muted text-muted-foreground font-semibold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>GST Amount (18%)</Label>
                      <Input
                        type="text"
                        readOnly
                        value={editingExpense.amount ? (Number(editingExpense.amount) - Number(editingExpense.amount) / 1.18).toFixed(2) : '0.00'}
                        className="bg-muted text-muted-foreground font-semibold"
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-end pt-4">
                <Button type="button" variant="ghost" onClick={() => setEditingExpense(null)} className="mr-2">Cancel</Button>
                <Button type="submit" variant="destructive">Save Changes</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* EDIT BANK DEPOSIT DIALOG */}
      <Dialog open={!!editingBankDeposit} onOpenChange={(open) => !open && setEditingBankDeposit(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Bank Deposit</DialogTitle>
          </DialogHeader>
          {editingBankDeposit && (
            <form onSubmit={handleUpdateBankDeposit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" className="[&::-webkit-calendar-picker-indicator]:block" value={editingBankDeposit.date} onChange={e => setEditingBankDeposit({ ...editingBankDeposit, date: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Autocomplete
                    value={editingBankDeposit.type}
                    onChange={v => setEditingBankDeposit({ ...editingBankDeposit, type: v as 'Cash' | 'Cheque' })}
                    suggestions={['Cash', 'Cheque']}
                    placeholder="Type Cash/Cheque..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Deposited Bank</Label>
                  <Autocomplete
                    value={editingBankDeposit.bank || ''}
                    onChange={v => setEditingBankDeposit({ ...editingBankDeposit, bank: v })}
                    suggestions={banks}
                    placeholder="Type bank..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input type="number" step="0.01" value={editingBankDeposit.amount} onChange={e => setEditingBankDeposit({ ...editingBankDeposit, amount: Number(e.target.value) })} required />
                </div>
                <div className="space-y-2">
                  <Label>Remarks</Label>
                  <Input value={editingBankDeposit.remarks || ''} onChange={e => setEditingBankDeposit({ ...editingBankDeposit, remarks: e.target.value })} />
                </div>
                {editingBankDeposit.type === 'Cheque' && (
                  <>
                    <div className="space-y-2">
                      <Label>Cheque No.</Label>
                      <Input value={editingBankDeposit.chequeNo || ''} onChange={e => setEditingBankDeposit({ ...editingBankDeposit, chequeNo: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Bank Name</Label>
                      <Autocomplete
                        value={editingBankDeposit.bankName || ''}
                        onChange={v => setEditingBankDeposit({ ...editingBankDeposit, bankName: v })}
                        suggestions={banks}
                        placeholder="Type bank name..."
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-end pt-4">
                <Button type="button" variant="ghost" onClick={() => setEditingBankDeposit(null)} className="mr-2">Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Save Changes</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* PDF PREVIEW DIALOG */}
      <Dialog open={!!pdfPreviewData} onOpenChange={(open) => !open && setPdfPreviewData(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>PDF Preview: {pdfPreviewData?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto border rounded mt-4">
            {pdfPreviewData && (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    {pdfPreviewData.headers.map((h, i) => <TableHead key={i}>{h}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pdfPreviewData.tableData.map((row, i) => (
                    <TableRow key={i}>
                      {row.map((cell, j) => <TableCell key={j}>{cell}</TableCell>)}
                    </TableRow>
                  ))}
                  {pdfPreviewData.tableData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={pdfPreviewData.headers.length} className="text-center py-4 text-muted-foreground">No data to preview</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
          <div className="flex justify-end pt-4 gap-2 mt-auto">
            <Button variant="ghost" onClick={() => setPdfPreviewData(null)}>Cancel</Button>
            <Button onClick={downloadGeneratedPDF} variant="default">
              <Download className="w-4 h-4 mr-2" /> Download PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAccountsPage;
