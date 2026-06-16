import { useState, useEffect } from 'react';
import { GlassCard, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { accountService, settingsService, Income, Expense, BankDeposit } from '@/lib/storage';
import { Trash2, Download, Pencil, ChevronUp, ChevronDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  // Data State
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bankDeposits, setBankDeposits] = useState<BankDeposit[]>([]);

  // Income Form State
  const [incomeForm, setIncomeForm] = useState({ date: '', clientName: '', paymentMethod: '', bank: '', amount: '', remarks: '', invoiceNumber: '' });
  
  // Expense Form State
  const [expenseForm, setExpenseForm] = useState({ date: '', category: '', amount: '', remarks: '' });

  // Bank Deposit Form State
  const [bankDepositForm, setBankDepositForm] = useState({ date: '', type: 'Cash', amount: '', chequeNo: '', bankName: '', remarks: '' });

  // Edit Modals State
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingBankDeposit, setEditingBankDeposit] = useState<BankDeposit | null>(null);

  // Form Collapse States
  const [showIncomeForm, setShowIncomeForm] = useState(true);
  const [showExpenseForm, setShowExpenseForm] = useState(true);
  const [showBankDepositForm, setShowBankDepositForm] = useState(true);

  // Filters
  const [incomeFilters, setIncomeFilters] = useState({ clientName: 'All', paymentMethod: 'All', bank: 'All', month: 'All', year: 'All', invoiceNumber: '', startDate: '', endDate: '' });
  const [expenseFilters, setExpenseFilters] = useState({ category: 'All', month: 'All', year: 'All', startDate: '', endDate: '' });
  const [bankDepositFilters, setBankDepositFilters] = useState({ type: 'All', month: 'All', year: 'All', startDate: '', endDate: '' });
  const [overviewFilters, setOverviewFilters] = useState({ month: 'All', year: 'All' });

  const loadData = async () => {
    try {
      const [
        clientsData, methodsData, banksData, categoriesData,
        incomesData, expensesData, bankDepositsData
      ] = await Promise.all([
        settingsService.get('accountClients'),
        settingsService.get('accountPaymentMethods'),
        settingsService.get('accountBanks'),
        settingsService.get('accountCategories'),
        accountService.getIncomes(),
        accountService.getExpenses(),
        accountService.getBankDeposits()
      ]);

      setClients(clientsData?.value || []);
      setPaymentMethods(methodsData?.value || []);
      setBanks(banksData?.value || []);
      setCategories(categoriesData?.value || []);
      
      setIncomes(incomesData || []);
      setExpenses(expensesData || []);
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
  const handleAddSetting = async (key: string, value: string, list: string[], setList: (val: string[]) => void, resetInput: () => void) => {
    if (!value.trim() || list.includes(value.trim())) return;
    const newList = [...list, value.trim()];
    try {
      await settingsService.update(key, newList);
      setList(newList);
      resetInput();
      toast({ title: 'Added successfully' });
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

  // Handlers for Forms
  const handleAddIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incomeForm.date || !incomeForm.clientName || !incomeForm.paymentMethod || !incomeForm.bank || !incomeForm.amount) {
      return toast({ title: 'Please fill all fields', variant: 'destructive' });
    }

    const dateObj = new Date(incomeForm.date);
    const month = dateObj.toLocaleString('default', { month: 'long' });
    const year = dateObj.getFullYear().toString();

    try {
      await accountService.createIncome({
        date: incomeForm.date,
        clientName: incomeForm.clientName,
        paymentMethod: incomeForm.paymentMethod,
        bank: incomeForm.bank,
        amount: Number(incomeForm.amount),
        month,
        year,
        remarks: incomeForm.remarks,
        invoiceNumber: incomeForm.invoiceNumber
      });
      toast({ title: 'Income added successfully' });
      setIncomeForm({ date: '', clientName: '', paymentMethod: '', bank: '', amount: '', remarks: '', invoiceNumber: '' });
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

    try {
      await accountService.createExpense({
        date: expenseForm.date,
        category: expenseForm.category,
        amount: Number(expenseForm.amount),
        month,
        year,
        remarks: expenseForm.remarks
      });
      toast({ title: 'Expense added successfully' });
      setExpenseForm({ date: '', category: '', amount: '', remarks: '' });
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
        amount: Number(bankDepositForm.amount),
        chequeNo: bankDepositForm.type === 'Cheque' ? bankDepositForm.chequeNo : undefined,
        bankName: bankDepositForm.type === 'Cheque' ? bankDepositForm.bankName : undefined,
        month,
        year,
        remarks: bankDepositForm.remarks
      });
      toast({ title: 'Bank Deposit added successfully' });
      setBankDepositForm({ date: '', type: 'Cash', amount: '', chequeNo: '', bankName: '', remarks: '' });
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
      await accountService.updateIncome(editingIncome.id, editingIncome);
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
      await accountService.updateExpense(editingExpense.id, editingExpense);
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

  const isDateInRange = (dateStr: string, startStr: string, endStr: string) => {
    if (!startStr && !endStr) return true;
    const date = new Date(dateStr);
    if (startStr) {
      const start = new Date(startStr);
      if (date < start) return false;
    }
    if (endStr) {
      const end = new Date(endStr);
      if (date > end) return false;
    }
    return true;
  };

  const filteredIncomes = incomes.filter(inc => {
    const matchInvoice = !incomeFilters.invoiceNumber || (inc.invoiceNumber && inc.invoiceNumber.toLowerCase().includes(incomeFilters.invoiceNumber.toLowerCase()));
    const matchDateRange = isDateInRange(inc.date, incomeFilters.startDate, incomeFilters.endDate);
    return matchDateRange && (incomeFilters.clientName === 'All' || inc.clientName === incomeFilters.clientName) &&
           (incomeFilters.paymentMethod === 'All' || inc.paymentMethod === incomeFilters.paymentMethod) &&
           (incomeFilters.bank === 'All' || inc.bank === incomeFilters.bank) &&
           (incomeFilters.month === 'All' || inc.month === incomeFilters.month) &&
           (incomeFilters.year === 'All' || inc.year === incomeFilters.year) &&
           matchInvoice;
  });

  const filteredExpenses = expenses.filter(exp => {
    const matchDateRange = isDateInRange(exp.date, expenseFilters.startDate, expenseFilters.endDate);
    return matchDateRange && (expenseFilters.category === 'All' || exp.category === expenseFilters.category) &&
           (expenseFilters.month === 'All' || exp.month === expenseFilters.month) &&
           (expenseFilters.year === 'All' || exp.year === expenseFilters.year);
  });

  const filteredBankDeposits = bankDeposits.filter(dep => {
    const matchDateRange = isDateInRange(dep.date, bankDepositFilters.startDate, bankDepositFilters.endDate);
    return matchDateRange && (bankDepositFilters.type === 'All' || dep.type === bankDepositFilters.type) &&
           (bankDepositFilters.month === 'All' || dep.month === bankDepositFilters.month) &&
           (bankDepositFilters.year === 'All' || dep.year === bankDepositFilters.year);
  });

  // Overview Totals
  const overviewIncomes = incomes.filter(inc => 
    (overviewFilters.month === 'All' || inc.month === overviewFilters.month) &&
    (overviewFilters.year === 'All' || inc.year === overviewFilters.year)
  );
  const overviewExpenses = expenses.filter(exp => 
    (overviewFilters.month === 'All' || exp.month === overviewFilters.month) &&
    (overviewFilters.year === 'All' || exp.year === overviewFilters.year)
  );
  const overviewDeposits = bankDeposits.filter(dep => 
    (overviewFilters.month === 'All' || dep.month === overviewFilters.month) &&
    (overviewFilters.year === 'All' || dep.year === overviewFilters.year)
  );

  const totalOverviewIncome = overviewIncomes.reduce((sum, item) => sum + item.amount, 0);
  const totalOverviewExpense = overviewExpenses.reduce((sum, item) => sum + item.amount, 0);
  const totalOverviewDeposit = overviewDeposits.reduce((sum, item) => sum + item.amount, 0);

  const totalIncome = filteredIncomes.reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalBankDeposit = filteredBankDeposits.reduce((acc, curr) => acc + curr.amount, 0);

  // PDF Export
  const downloadPDF = (data: any[], title: string) => {
    if (data.length === 0) return toast({ title: 'No data to download' });
    const doc = new jsPDF();
    const headers = Object.keys(data[0]).filter(k => k !== 'id' && k !== 'createdAt' && k !== 'updatedAt');
    const tableData = data.map(row => headers.map(header => row[header] || '-'));
    
    doc.text(title, 14, 15);
    autoTable(doc, {
      head: [headers.map(h => h.charAt(0).toUpperCase() + h.slice(1).replace(/([A-Z])/g, ' $1').trim())],
      body: tableData,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [22, 160, 133] }
    });
    doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const getUniqueValues = (data: any[], key: string) => {
    return Array.from(new Set(data.map(item => item[key])));
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Accounts Management</h1>
      </div>

      <Tabs defaultValue="income" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 max-w-3xl mb-4 h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="expense">Expense</TabsTrigger>
          <TabsTrigger value="bank-deposit">Bank Deposit</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4">
          <GlassCard>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between pb-2">
              <CardTitle className="text-2xl font-bold">Total Overview</CardTitle>
              <div className="flex gap-2 mt-2 md:mt-0">
                <Select value={overviewFilters.month} onValueChange={v => setOverviewFilters({ ...overviewFilters, month: v })}>
                  <SelectTrigger className="w-[120px]"><SelectValue placeholder="Month" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Months</SelectItem>
                    {getUniqueValues([...incomes, ...expenses, ...bankDeposits], 'month').map((m: any) => m && <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={overviewFilters.year} onValueChange={v => setOverviewFilters({ ...overviewFilters, year: v })}>
                  <SelectTrigger className="w-[120px]"><SelectValue placeholder="Year" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Years</SelectItem>
                    {getUniqueValues([...incomes, ...expenses, ...bankDeposits], 'year').map((y: any) => y && <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                <div className="bg-green-100 dark:bg-green-900/30 p-6 rounded-xl border border-green-200 dark:border-green-800 flex flex-col items-center justify-center">
                  <span className="text-green-800 dark:text-green-400 text-sm font-semibold uppercase tracking-wider mb-2">Total Income</span>
                  <span className="text-4xl font-bold text-green-900 dark:text-green-300">₹{totalOverviewIncome.toLocaleString()}</span>
                </div>
                <div className="bg-red-100 dark:bg-red-900/30 p-6 rounded-xl border border-red-200 dark:border-red-800 flex flex-col items-center justify-center">
                  <span className="text-red-800 dark:text-red-400 text-sm font-semibold uppercase tracking-wider mb-2">Total Expense</span>
                  <span className="text-4xl font-bold text-red-900 dark:text-red-300">₹{totalOverviewExpense.toLocaleString()}</span>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/30 p-6 rounded-xl border border-blue-200 dark:border-blue-800 flex flex-col items-center justify-center">
                  <span className="text-blue-800 dark:text-blue-400 text-sm font-semibold uppercase tracking-wider mb-2">Total Bank Deposit</span>
                  <span className="text-4xl font-bold text-blue-900 dark:text-blue-300">₹{totalOverviewDeposit.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </GlassCard>
        </TabsContent>

        {/* INCOME TAB */}
        <TabsContent value="income" className="space-y-4 mt-4">
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
                    <Select value={incomeForm.clientName} onValueChange={v => setIncomeForm({ ...incomeForm, clientName: v })}>
                      <SelectTrigger><SelectValue placeholder="Select Client" /></SelectTrigger>
                      <SelectContent>
                        {clients.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Mode</Label>
                    <Select value={incomeForm.paymentMethod} onValueChange={v => setIncomeForm({ ...incomeForm, paymentMethod: v })}>
                      <SelectTrigger><SelectValue placeholder="Select Mode" /></SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Deposited Bank</Label>
                    <Select value={incomeForm.bank} onValueChange={v => setIncomeForm({ ...incomeForm, bank: v })}>
                      <SelectTrigger><SelectValue placeholder="Select Bank" /></SelectTrigger>
                      <SelectContent>
                        {banks.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input type="number" step="0.01" value={incomeForm.amount} onChange={e => setIncomeForm({ ...incomeForm, amount: e.target.value })} required placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Remarks</Label>
                    <Input value={incomeForm.remarks} onChange={e => setIncomeForm({ ...incomeForm, remarks: e.target.value })} placeholder="Optional" />
                  </div>
                  <div className="space-y-2">
                    <Label>Invoice / Proforma No.</Label>
                    <Input value={incomeForm.invoiceNumber} onChange={e => setIncomeForm({ ...incomeForm, invoiceNumber: e.target.value })} placeholder="Optional" />
                  </div>
                  <div className="md:col-span-1">
                    <Button type="submit" variant="royal" className="w-full">Add Income</Button>
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
                <Button variant="outline" size="sm" onClick={() => downloadPDF(filteredIncomes, 'Income Records')}>
                  <Download className="w-4 h-4 mr-2" /> Export PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 justify-between mb-4">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 flex-1">
                  <Input placeholder="Filter Invoice No." value={incomeFilters.invoiceNumber} onChange={e => setIncomeFilters({ ...incomeFilters, invoiceNumber: e.target.value })} />
                  <Select value={incomeFilters.clientName} onValueChange={v => setIncomeFilters({ ...incomeFilters, clientName: v })}>
                    <SelectTrigger><SelectValue placeholder="Filter Client" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Clients</SelectItem>
                      {getUniqueValues(incomes, 'clientName').map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={incomeFilters.paymentMethod} onValueChange={v => setIncomeFilters({ ...incomeFilters, paymentMethod: v })}>
                    <SelectTrigger><SelectValue placeholder="Filter Mode" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Modes</SelectItem>
                      {getUniqueValues(incomes, 'paymentMethod').map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={incomeFilters.bank} onValueChange={v => setIncomeFilters({ ...incomeFilters, bank: v })}>
                    <SelectTrigger><SelectValue placeholder="Filter Bank" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Banks</SelectItem>
                      {getUniqueValues(incomes, 'bank').map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={incomeFilters.month} onValueChange={v => setIncomeFilters({ ...incomeFilters, month: v })}>
                    <SelectTrigger><SelectValue placeholder="Filter Month" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Months</SelectItem>
                      {getUniqueValues(incomes, 'month').map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={incomeFilters.year} onValueChange={v => setIncomeFilters({ ...incomeFilters, year: v })}>
                    <SelectTrigger><SelectValue placeholder="Filter Year" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Years</SelectItem>
                      {getUniqueValues(incomes, 'year').map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-success/10 text-success px-4 py-2 rounded-lg border border-success/20 shadow-sm flex items-center justify-center gap-3 shrink-0">
                  <span className="font-semibold text-sm">Total Income:</span>
                  <span className="text-xl font-bold">₹{totalIncome.toLocaleString()}</span>
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-green-800 hover:bg-green-700 text-white">
                      <TableHead className="text-white">Date</TableHead>
                      <TableHead className="text-white">Client Name</TableHead>
                      <TableHead className="text-white">Mode of Payment</TableHead>
                      <TableHead className="text-white">Deposited Bank</TableHead>
                      <TableHead className="text-white">Month</TableHead>
                      <TableHead className="text-white">Year</TableHead>
                      <TableHead className="text-white">Invoice No.</TableHead>
                      <TableHead className="text-white">Remarks</TableHead>
                      <TableHead className="text-right text-white">Amount</TableHead>
                      <TableHead className="w-[80px] text-white"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIncomes.map((inc) => (
                      <TableRow key={inc.id}>
                        <TableCell>{inc.date}</TableCell>
                        <TableCell className="font-medium">{inc.clientName}</TableCell>
                        <TableCell>{inc.paymentMethod}</TableCell>
                        <TableCell>{inc.bank}</TableCell>
                        <TableCell>{inc.month}</TableCell>
                        <TableCell>{inc.year}</TableCell>
                        <TableCell>{inc.invoiceNumber || '-'}</TableCell>
                        <TableCell className="max-w-[150px] truncate" title={inc.remarks}>{inc.remarks || '-'}</TableCell>
                        <TableCell className="text-right font-medium">₹{inc.amount.toLocaleString()}</TableCell>
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
                        <TableCell colSpan={10} className="text-center py-4 text-muted-foreground">No income records found</TableCell>
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
                <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" className="[&::-webkit-calendar-picker-indicator]:block" value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={expenseForm.category} onValueChange={v => setExpenseForm({ ...expenseForm, category: v })}>
                      <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                      <SelectContent>
                        {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input type="number" step="0.01" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} required placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Remarks</Label>
                    <Input value={expenseForm.remarks} onChange={e => setExpenseForm({ ...expenseForm, remarks: e.target.value })} placeholder="Optional" />
                  </div>
                  <Button type="submit" variant="destructive" className="w-full">Add Expense</Button>
                </form>
              </CardContent>
            )}
          </GlassCard>

          <GlassCard>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Expense Records</CardTitle>
              <Button variant="outline" size="sm" onClick={() => downloadPDF(filteredExpenses, 'Expense Records')}>
                <Download className="w-4 h-4 mr-2" /> Export PDF
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 justify-between mb-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 flex-1">
                  <Input type="date" className="[&::-webkit-calendar-picker-indicator]:block" value={expenseFilters.startDate} onChange={e => setExpenseFilters({ ...expenseFilters, startDate: e.target.value })} placeholder="Start Date" />
                  <Input type="date" className="[&::-webkit-calendar-picker-indicator]:block" value={expenseFilters.endDate} onChange={e => setExpenseFilters({ ...expenseFilters, endDate: e.target.value })} placeholder="End Date" />
                  <Select value={expenseFilters.category} onValueChange={v => setExpenseFilters({ ...expenseFilters, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Filter Category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Categories</SelectItem>
                      {getUniqueValues(expenses, 'category').map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={expenseFilters.month} onValueChange={v => setExpenseFilters({ ...expenseFilters, month: v })}>
                    <SelectTrigger><SelectValue placeholder="Filter Month" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Months</SelectItem>
                      {getUniqueValues(expenses, 'month').map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={expenseFilters.year} onValueChange={v => setExpenseFilters({ ...expenseFilters, year: v })}>
                    <SelectTrigger><SelectValue placeholder="Filter Year" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Years</SelectItem>
                      {getUniqueValues(expenses, 'year').map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-lg border border-destructive/20 shadow-sm flex items-center justify-center gap-3 shrink-0">
                  <span className="font-semibold text-sm">Total Expense:</span>
                  <span className="text-xl font-bold">₹{totalExpense.toLocaleString()}</span>
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-destructive/10 hover:bg-destructive/10">
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((exp) => (
                      <TableRow key={exp.id}>
                        <TableCell>{exp.date}</TableCell>
                        <TableCell className="font-medium">{exp.category}</TableCell>
                        <TableCell>{exp.month}</TableCell>
                        <TableCell>{exp.year}</TableCell>
                        <TableCell className="max-w-[150px] truncate" title={exp.remarks}>{exp.remarks || '-'}</TableCell>
                        <TableCell className="text-right font-medium">₹{exp.amount.toLocaleString()}</TableCell>
                        <TableCell className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => setEditingExpense(exp)} className="text-blue-500 hover:text-blue-700">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteExpense(exp.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredExpenses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">No expense records found</TableCell>
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
                <form onSubmit={handleAddBankDeposit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" className="[&::-webkit-calendar-picker-indicator]:block" value={bankDepositForm.date} onChange={e => setBankDepositForm({ ...bankDepositForm, date: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={bankDepositForm.type} onValueChange={v => setBankDepositForm({ ...bankDepositForm, type: v })}>
                      <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
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
                        <Input value={bankDepositForm.bankName} onChange={e => setBankDepositForm({ ...bankDepositForm, bankName: e.target.value })} required placeholder="Bank Name" />
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
              <Button variant="outline" size="sm" onClick={() => downloadPDF(filteredBankDeposits, 'Bank Deposits')}>
                <Download className="w-4 h-4 mr-2" /> Export PDF
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 justify-between mb-4">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 flex-1">
                  <Input type="date" className="[&::-webkit-calendar-picker-indicator]:block" value={bankDepositFilters.startDate} onChange={e => setBankDepositFilters({ ...bankDepositFilters, startDate: e.target.value })} placeholder="Start Date" />
                  <Input type="date" className="[&::-webkit-calendar-picker-indicator]:block" value={bankDepositFilters.endDate} onChange={e => setBankDepositFilters({ ...bankDepositFilters, endDate: e.target.value })} placeholder="End Date" />
                  <Select value={bankDepositFilters.type} onValueChange={v => setBankDepositFilters({ ...bankDepositFilters, type: v })}>
                    <SelectTrigger><SelectValue placeholder="Filter Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Types</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={bankDepositFilters.month} onValueChange={v => setBankDepositFilters({ ...bankDepositFilters, month: v })}>
                    <SelectTrigger><SelectValue placeholder="Filter Month" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Months</SelectItem>
                      {getUniqueValues(bankDeposits, 'month').map(m => m && <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={bankDepositFilters.year} onValueChange={v => setBankDepositFilters({ ...bankDepositFilters, year: v })}>
                    <SelectTrigger><SelectValue placeholder="Filter Year" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Years</SelectItem>
                      {getUniqueValues(bankDeposits, 'year').map(y => y && <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
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
                        <TableCell>{dep.date}</TableCell>
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

        {/* SETTINGS TAB */}
        <TabsContent value="settings" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Clients Setting */}
            <GlassCard>
              <CardHeader><CardTitle>Manage Clients</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Input placeholder="New client name" value={newClient} onChange={e => setNewClient(e.target.value)} />
                  <Button onClick={() => handleAddSetting('accountClients', newClient, clients, setClients, () => setNewClient(''))}>Add</Button>
                </div>
                <div className="space-y-2">
                  {clients.map(c => (
                    <div key={c} className="flex justify-between items-center p-2 bg-muted/50 rounded border">
                      <span>{c}</span>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveSetting('accountClients', c, clients, setClients)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
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
                  <Input placeholder="New payment method" value={newPaymentMethod} onChange={e => setNewPaymentMethod(e.target.value)} />
                  <Button onClick={() => handleAddSetting('accountPaymentMethods', newPaymentMethod, paymentMethods, setPaymentMethods, () => setNewPaymentMethod(''))}>Add</Button>
                </div>
                <div className="space-y-2">
                  {paymentMethods.map(m => (
                    <div key={m} className="flex justify-between items-center p-2 bg-muted/50 rounded border">
                      <span>{m}</span>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveSetting('accountPaymentMethods', m, paymentMethods, setPaymentMethods)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
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
                  <Input placeholder="New bank name" value={newBank} onChange={e => setNewBank(e.target.value)} />
                  <Button onClick={() => handleAddSetting('accountBanks', newBank, banks, setBanks, () => setNewBank(''))}>Add</Button>
                </div>
                <div className="space-y-2">
                  {banks.map(b => (
                    <div key={b} className="flex justify-between items-center p-2 bg-muted/50 rounded border">
                      <span>{b}</span>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveSetting('accountBanks', b, banks, setBanks)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
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
                  <Input placeholder="New category" value={newCategory} onChange={e => setNewCategory(e.target.value)} />
                  <Button onClick={() => handleAddSetting('accountCategories', newCategory, categories, setCategories, () => setNewCategory(''))}>Add</Button>
                </div>
                <div className="space-y-2">
                  {categories.map(c => (
                    <div key={c} className="flex justify-between items-center p-2 bg-muted/50 rounded border">
                      <span>{c}</span>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveSetting('accountCategories', c, categories, setCategories)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
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
                  <Select value={editingIncome.clientName} onValueChange={v => setEditingIncome({ ...editingIncome, clientName: v })}>
                    <SelectTrigger><SelectValue placeholder="Select Client" /></SelectTrigger>
                    <SelectContent>
                      {clients.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Payment Mode</Label>
                  <Select value={editingIncome.paymentMethod} onValueChange={v => setEditingIncome({ ...editingIncome, paymentMethod: v })}>
                    <SelectTrigger><SelectValue placeholder="Select Mode" /></SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Deposited Bank</Label>
                  <Select value={editingIncome.bank} onValueChange={v => setEditingIncome({ ...editingIncome, bank: v })}>
                    <SelectTrigger><SelectValue placeholder="Select Bank" /></SelectTrigger>
                    <SelectContent>
                      {banks.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input type="number" step="0.01" value={editingIncome.amount} onChange={e => setEditingIncome({ ...editingIncome, amount: Number(e.target.value) })} required />
                </div>
                <div className="space-y-2">
                  <Label>Invoice/Proforma No.</Label>
                  <Input value={editingIncome.invoiceNumber || ''} onChange={e => setEditingIncome({ ...editingIncome, invoiceNumber: e.target.value })} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Remarks</Label>
                  <Input value={editingIncome.remarks || ''} onChange={e => setEditingIncome({ ...editingIncome, remarks: e.target.value })} />
                </div>
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
                  <Select value={editingExpense.category} onValueChange={v => setEditingExpense({ ...editingExpense, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input type="number" step="0.01" value={editingExpense.amount} onChange={e => setEditingExpense({ ...editingExpense, amount: Number(e.target.value) })} required />
                </div>
                <div className="space-y-2">
                  <Label>Remarks</Label>
                  <Input value={editingExpense.remarks || ''} onChange={e => setEditingExpense({ ...editingExpense, remarks: e.target.value })} />
                </div>
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
                  <Select value={editingBankDeposit.type} onValueChange={v => setEditingBankDeposit({ ...editingBankDeposit, type: v as 'Cash' | 'Cheque' })}>
                    <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
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
                      <Input value={editingBankDeposit.bankName || ''} onChange={e => setEditingBankDeposit({ ...editingBankDeposit, bankName: e.target.value })} required />
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
    </div>
  );
};

export default AdminAccountsPage;
