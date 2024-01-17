import MemberForm from '../components/MemberForm';
import MemberList from '../components/MemberList';
import Container from '../components/ui/Container';

export function Members() {
  return (
    <Container className='space-y-4'>
      <div className='text-center'>
        <h1 className='text-xl'>Miembros</h1>
        <p>
          Agrega a los miembros del grupo con quienes dividirás los gastos. En
          el siguiente paso podrás agregar las deudas.
        </p>
      </div>

      <MemberForm />

      <MemberList />
    </Container>
  );
}

export default Members;
